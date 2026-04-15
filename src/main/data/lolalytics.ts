import { net } from 'electron'
import * as cheerio from 'cheerio'
import type { ChampionStats, Build, Tier } from '@shared/types'
import type { Role } from '@shared/constants'
import { cache, keys } from './cache'
import { getStaticEntry } from './tierlist'

// ─── Role mapping ─────────────────────────────────────────────────────────────
// Lolalytics usa 'bottom' (no 'adc') y 'middle' (no 'mid') en las URLs
const LANE: Record<Role, string> = {
  top: 'top', jungle: 'jungle', middle: 'middle', bottom: 'bottom', utility: 'support'
}

// net.fetch usa el stack de red de Chromium — mismo fingerprint TLS que Chrome
const HEADERS: Record<string, string> = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control':   'no-cache',
}

async function fetchHtml(url: string): Promise<{ html: string; status: number } | null> {
  try {
    const res = await net.fetch(url, { headers: HEADERS })
    if (!res.ok) return { html: '', status: res.status }
    return { html: await res.text(), status: res.status }
  } catch (err) {
    console.warn(`[Lolalytics] net.fetch error: ${(err as Error).message}`)
    return null
  }
}

const RUNE_PATHS: Record<number, string> = {
  8000: 'Precision', 8100: 'Domination', 8200: 'Sorcery',
  8300: 'Inspiration', 8400: 'Resolve'
}

export function toShortPatch(patch: string): string {
  const [major, minor] = patch.split('.')
  return `${major}.${minor}`
}

// ─── Helpers para identificar IDs de LoL ─────────────────────────────────────
const RUNE_PATH_IDS = new Set([8000, 8100, 8200, 8300, 8400])
const isItemId   = (n: number) => Number.isInteger(n) && n >= 1001 && n < 8000
// Rune IDs normales (8xxx) + shards (5001-5013)
const isRuneId   = (n: number) => Number.isInteger(n) && (
  (n >= 8001 && n <= 9300 && !RUNE_PATH_IDS.has(n)) ||
  (n >= 5001 && n <= 5013)
)
const isRunePath = (n: number) => RUNE_PATH_IDS.has(n)

// Inferir el path de una runa a partir de su ID de keystone
// Keystones: 8000→Precision, 8100→Domination, 8200→Sorcery, 8300→Inspiration, 8400→Resolve
function inferRunePath(runeId: number): number {
  if (runeId >= 8000 && runeId < 8100) return 8000
  if (runeId >= 8100 && runeId < 8200) return 8100
  if (runeId >= 8200 && runeId < 8300) return 8200
  if (runeId >= 8300 && runeId < 8400) return 8300
  if (runeId >= 8400 && runeId < 8500) return 8400
  // Runes in the 9xxx range (slot runes like 9101, 9103, etc.)
  if (runeId >= 9100 && runeId < 9200) return 8000  // Precision slot runes
  return 8000 // default
}

interface NextDataResult {
  winRate: number; pickRate: number; banRate: number; tier: Tier
  items: number[]
  primaryPath: number; secondaryPath: number
  primaryRunes: number[]; secondaryRunes: number[]; shards: number[]
  found: boolean
}

// ─── Extract from __NEXT_DATA__ JSON (primary method) ─────────────────────────
function extractFromNextData(html: string): NextDataResult {
  const empty: NextDataResult = {
    winRate: 0, pickRate: 0, banRate: 0, tier: 'C',
    items: [], primaryPath: 8000, secondaryPath: 8100,
    primaryRunes: [], secondaryRunes: [], shards: [],
    found: false
  }

  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (!match) return empty

  let json: unknown
  try { json = JSON.parse(match[1]) } catch { return empty }

  // ── Recopilamos arrays de números y valores de interés ─────────────────────
  const numArrays: number[][] = []
  let winRate = 0, pickRate = 0

  const walk = (v: unknown, key = '', depth = 0): void => {
    if (depth > 12 || v === null || v === undefined) return
    if (typeof v === 'number') {
      // Win rate como decimal (0.40–0.65) o porcentaje (40–65)
      const STAT_KEYS = ['wr', 'win_rate', 'winRate', 'win']
      if (!winRate && STAT_KEYS.includes(key)) {
        if (v > 0.40 && v < 0.65)   winRate = v
        else if (v > 40 && v < 65)   winRate = v / 100
      }
      if (!pickRate && (key === 'pr' || key === 'pick_rate' || key === 'pickRate')) {
        if (v > 0 && v < 1)   pickRate = v
        else if (v > 0 && v < 100) pickRate = v / 100
      }
      return
    }
    if (Array.isArray(v)) {
      if (v.length >= 2 && v.every((x): x is number => typeof x === 'number')) {
        numArrays.push(v)
      } else {
        v.forEach((item, i) => walk(item, String(i), depth + 1))
      }
      return
    }
    if (typeof v === 'object') {
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        walk(val, k, depth + 1)
      }
    }
  }

  walk(json)

  // ── Extraer items ──────────────────────────────────────────────────────────
  // Caso 1: array plano de item IDs [3068, 3742, 3110, ...]
  let bestItems: number[] = []
  for (const arr of numArrays) {
    const items = arr.filter(isItemId)
    if (items.length >= 3 && items.length <= 7 && items.length > bestItems.length) {
      bestItems = items
    }
  }

  // Caso 2: sub-arrays [[itemId, games, wins], [itemId, games, wins], ...]
  // El primer elemento de cada sub-array es el item ID
  const subArrayItems: number[] = []
  for (const arr of numArrays) {
    if (arr.length >= 2 && arr.length <= 5 && isItemId(arr[0])) {
      subArrayItems.push(arr[0])
    }
  }
  if (subArrayItems.length >= 3 && subArrayItems.length > bestItems.length) {
    bestItems = subArrayItems.slice(0, 6)
  }

  // ── Extraer runas ──────────────────────────────────────────────────────────
  let primaryPath = 8000, secondaryPath = 8100
  let primaryRunes: number[] = [], secondaryRunes: number[] = [], shards: number[] = []

  for (const arr of numArrays) {
    const paths = arr.filter(isRunePath)
    const runes = arr.filter(isRuneId)
    if (paths.length >= 2 && runes.length >= 4) {
      primaryPath    = paths[0]
      secondaryPath  = paths[1]
      primaryRunes   = runes.slice(0, 4)
      secondaryRunes = runes.slice(4, 6)
      shards         = runes.slice(6, 9)
      break
    }
  }

  const found = winRate > 0 || bestItems.length > 0 || primaryRunes.length > 0

  if (!found) {
    // Log structure keys for debugging when nothing was found
    const keys: string[] = []
    const collectKeys = (o: unknown, prefix = '', d = 0): void => {
      if (d > 4 || !o || typeof o !== 'object' || Array.isArray(o)) return
      for (const k of Object.keys(o as object)) {
        keys.push(`${prefix}${k}`)
        collectKeys((o as Record<string,unknown>)[k], `${prefix}${k}.`, d + 1)
      }
    }
    collectKeys(json)
    console.log('[Lolalytics] __NEXT_DATA__ keys:', keys.slice(0, 60).join(', '))
  }

  return { winRate, pickRate, banRate: 0, tier: 'C', items: bestItems,
    primaryPath, secondaryPath, primaryRunes, secondaryRunes, shards, found }
}

// ─── Extract percentages from text ────────────────────────────────────────────
function pct(text: string): number | null {
  const m = text.match(/([\d.]+)\s*%/)
  return m ? parseFloat(m[1]) / 100 : null
}

// ─── HTML scraping (fallback) ─────────────────────────────────────────────────
function scrapeHtml(html: string): {
  winRate: number; pickRate: number; banRate: number; tier: Tier
  items: number[]; primaryRunes: number[]; secondaryRunes: number[]
  primaryPath: number; secondaryPath: number; shards: number[]
} {
  const $ = cheerio.load(html)

  let winRate = 0, pickRate = 0, banRate = 0

  // Method 1: look for stat label → adjacent sibling value
  $('div, span').each((_, el) => {
    const t = $(el).text().trim()
    if (!winRate && t === 'Win Rate') {
      const next = $(el).next().text()
      const parent = $(el).parent().text()
      winRate = pct(next) ?? pct(parent) ?? 0
    }
    if (!pickRate && t === 'Pick Rate') {
      pickRate = pct($(el).next().text()) ?? pct($(el).parent().text()) ?? 0
    }
    if (!banRate && t === 'Ban Rate') {
      banRate = pct($(el).next().text()) ?? pct($(el).parent().text()) ?? 0
    }
  })

  // Method 2: look for any span/div that contains a recognisable WR percentage near the top
  if (!winRate) {
    const allPcts: number[] = []
    $('span, div').each((_, el) => {
      const t = $(el).children().length === 0 ? $(el).text().trim() : ''
      const v = pct(t)
      if (v !== null && v > 0.30 && v < 0.80) allPcts.push(v)
    })
    // Typical LoL win rates cluster around 0.45–0.55
    if (allPcts.length >= 1) winRate = allPcts[0]
  }

  // Tier from image src
  let tier: Tier = 'C'
  const tierMap: Record<string, Tier> = {
    challenger: 'S', grandmaster: 'S', master: 'S',
    diamond: 'A', emerald: 'A', platinum: 'B',
    gold: 'B', silver: 'C', bronze: 'D', iron: 'D'
  }
  $('img').each((_, el) => {
    const src = $(el).attr('src') ?? ''
    const m = src.match(/(challenger|grandmaster|master|diamond|emerald|platinum|gold|silver|bronze|iron)/i)
    if (m) { tier = tierMap[m[1].toLowerCase()] ?? 'C'; return false as unknown as void }
  })

  // Items — CDN pattern: cdn5.lolalytics.com/item64/{id}.webp
  // Filter out starter/consumable items (Health Potions, Doran items, etc.)
  const STARTER_ITEMS = new Set([2003, 2010, 2031, 2033, 2055, 2056, 2138, 2139, 2140, 3340, 3363, 3364, 3330])
  const allItems: number[] = []
  $('img[src*="item"]').each((_, el) => {
    const src = $(el).attr('src') ?? ''
    const m = src.match(/\/item(?:64|32|)?\/(\d+)(?:\.webp|\.png)?/)
    if (m) {
      const id = Number(m[1])
      if (isItemId(id) && !allItems.includes(id)) allItems.push(id)
    }
  })
  // Tomar los primeros 6 que no sean starter items, o si no hay suficientes, incluir starters
  const coreItems = allItems.filter(id => !STARTER_ITEMS.has(id))
  const items = coreItems.length >= 3 ? coreItems.slice(0, 6) : allItems.filter(id => !STARTER_ITEMS.has(id) || allItems.indexOf(id) < 6).slice(0, 6)

  // Runes — CDN pattern: cdn5.lolalytics.com/rune68/{id}.webp
  // Lolalytics marca las runas NO seleccionadas con clases 'grayscale opacity-70'.
  // Solo extraemos las que NO tienen esas clases → son las del build óptimo.
  const runeList: number[] = []
  $('img[src*="rune"]').each((_, el) => {
    const cls = $(el).attr('class') ?? ''
    // Ignorar runas con grayscale (no seleccionadas)
    if (cls.includes('grayscale') || cls.includes('opacity-70')) return
    const src = $(el).attr('src') ?? ''
    const m = src.match(/\/rune(?:68|32|)?\/(\d+)(?:\.webp|\.png)?/)
    const id = m ? Number(m[1]) : 0
    if (id >= 8000 && id <= 9300 && !runeList.includes(id)) runeList.push(id)
  })

  // Split rune list into paths + individual runes
  // Resultado esperado: 4 primary (keystone + 3 slots) + 2 secondary
  let primaryPath = 8000, secondaryPath = 8100
  let primaryRunes: number[] = [], secondaryRunes: number[] = []

  if (runeList.length >= 2) {
    // Lolalytics ya no muestra iconos de path — inferir del keystone
    const pathIds = runeList.filter(id => RUNE_PATHS[id])
    const runeIds = runeList.filter(id => !RUNE_PATHS[id])

    if (pathIds.length >= 2) {
      primaryPath = pathIds[0]
      secondaryPath = pathIds[1]
    } else if (runeIds.length >= 1) {
      // Inferir path del primer rune (keystone)
      primaryPath = inferRunePath(runeIds[0])
      // Buscar la primera runa de un path DIFERENTE para secondaryPath
      for (const rid of runeIds.slice(4)) {
        const p = inferRunePath(rid)
        if (p !== primaryPath) { secondaryPath = p; break }
      }
    }

    primaryRunes   = runeIds.slice(0, 4)
    secondaryRunes = runeIds.slice(4, 6)
  }

  return { winRate, pickRate, banRate, tier, items, primaryPath, secondaryPath, primaryRunes, secondaryRunes, shards: [] }
}

// ─── Main scrape function ─────────────────────────────────────────────────────
// Lolalytics no acepta ?patch= — lo ignora o devuelve 404.
// El parche activo lo determina el servidor automáticamente.
// Lolalytics acepta lane=bottom/middle/top/jungle/support (NO adc ni mid).
const LOLALYTICS_URLS = (champKey: string, lane: string) => [
  `https://lolalytics.com/lol/${champKey.toLowerCase()}/build/?lane=${lane}`,
  `https://lolalytics.com/lol/${champKey.toLowerCase()}/build/?lane=${lane}&tier=all`,
  `https://lolalytics.com/lol/${champKey.toLowerCase()}/build/`,
]

async function scrapeChampionData(
  champKey: string,
  lane: string,
  shortPatch: string
): Promise<{ stats: ChampionStats; build: Build } | null> {
  let html: string | null = null

  for (const url of LOLALYTICS_URLS(champKey, lane)) {
    const result = await fetchHtml(url)
    if (!result) break                        // network error — abort
    if (result.status === 200 && result.html) { html = result.html; break }
    if (result.status !== 404) {
      console.warn(`[Lolalytics] ${champKey}/${lane}: HTTP ${result.status}`)
      break
    }
    // 404 → try next variant
  }

  if (!html) {
    // Fallback: usar datos estáticos del tier list embebido
    const roleMap = (Object.entries(LANE).find(([, v]) => v === lane)?.[0] ?? 'middle') as Role
    const staticEntry = getStaticEntry(champKey, roleMap)
    if (staticEntry) {
      console.log(`[Lolalytics] ${champKey}/${lane}: usando datos estáticos (tier ${staticEntry.tier})`)
      const stats: ChampionStats = {
        champKey, role: roleMap, patch: shortPatch,
        winRate: staticEntry.winRate, pickRate: 0.05, banRate: 0,
        tier: staticEntry.tier, matchups: []
      }
      const build: Build = {
        championId: 0, role: roleMap, items: [],
        runes: { primaryPath: 8000, primaryRunes: [], secondaryPath: 8100, secondaryRunes: [], shards: [] }
      }
      return { stats, build }
    }
    console.warn(`[Lolalytics] ${champKey}/${lane}: sin datos (ni live ni estáticos)`)
    return null
  }

  // __NEXT_DATA__ JSON — fuente principal (win rate + items + runas si el SSR los incluye)
  const nd = extractFromNextData(html)

  // HTML scraping — fallback para win rate y tier (img tags de íconos de rango)
  const scraped = scrapeHtml(html)

  // Prioridad: __NEXT_DATA__ > HTML scraping > neutrales
  const winRate   = nd.winRate   || scraped.winRate   || 0.495
  const pickRate  = nd.pickRate  || scraped.pickRate  || 0.05
  const banRate   = scraped.banRate || 0
  const tier      = scraped.tier

  // Items y runas: usar __NEXT_DATA__ si encontró algo, si no HTML scraping
  const items         = nd.items.length         > 0 ? nd.items         : scraped.items
  const primaryPath   = nd.primaryRunes.length  > 0 ? nd.primaryPath   : scraped.primaryPath
  const secondaryPath = nd.primaryRunes.length  > 0 ? nd.secondaryPath : scraped.secondaryPath
  const primaryRunes  = nd.primaryRunes.length  > 0 ? nd.primaryRunes  : scraped.primaryRunes
  const secondaryRunes= nd.secondaryRunes.length> 0 ? nd.secondaryRunes: scraped.secondaryRunes
  const shards        = nd.shards.length        > 0 ? nd.shards        : scraped.shards

  if (!winRate && !nd.found) {
    console.warn(`[Lolalytics] ${champKey}/${lane}: no se extrajo win rate. La página puede requerir JS.`)
  }

  console.log(`[Lolalytics] ${champKey}/${lane}: WR=${(winRate*100).toFixed(1)}% items=${items.length} runes=${primaryRunes.length}`)

  const roleMap = (Object.entries(LANE).find(([, v]) => v === lane)?.[0] ?? 'middle') as Role

  const stats: ChampionStats = {
    champKey, role: roleMap, patch: shortPatch,
    winRate, pickRate, banRate, tier, matchups: []
  }

  const build: Build = {
    championId: 0, role: roleMap, items,
    runes: { primaryPath, primaryRunes, secondaryPath, secondaryRunes, shards }
  }

  return { stats, build }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchChampionData(
  champKey: string,
  role: Role,
  patch: string
): Promise<{ stats: ChampionStats | null; build: Build | null }> {
  const shortPatch = toShortPatch(patch)
  const sKey = keys.stats(champKey, role, shortPatch)
  const bKey = keys.build(champKey, role, shortPatch)

  const cachedStats = cache.get<ChampionStats>(sKey)
  const cachedBuild = cache.get<Build>(bKey)
  if (cachedStats && cachedBuild) return { stats: cachedStats, build: cachedBuild }

  const data = await scrapeChampionData(champKey, LANE[role], shortPatch)
  if (!data) return { stats: null, build: null }

  cache.set(sKey, data.stats)
  cache.set(bKey, data.build)
  console.log(`[Lolalytics] ${champKey}/${role} → WR ${(data.stats.winRate * 100).toFixed(1)}% tier ${data.stats.tier}`)

  return data
}

export async function fetchChampionStats(champKey: string, role: Role, patch: string): Promise<ChampionStats | null> {
  return (await fetchChampionData(champKey, role, patch)).stats
}

export async function fetchChampionBuild(champKey: string, role: Role, patch: string): Promise<Build | null> {
  return (await fetchChampionData(champKey, role, patch)).build
}
