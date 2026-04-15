import { net } from 'electron'
import * as cheerio from 'cheerio'
import type { ChampionStats, Build, Tier, Role } from '@shared/types'
import { cache, keys } from './cache'
import { getStaticEntry } from './tierlist'

// ─── Role mapping ─────────────────────────────────────────────────────────────
const LANE: Record<Role, string> = {
  top: 'top', jungle: 'jungle', middle: 'mid', bottom: 'adc', utility: 'support'
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

// ─── Extract from __NEXT_DATA__ JSON (primary method) ─────────────────────────
function extractFromNextData(html: string): { stats: Partial<Record<string, number | string>>; found: boolean } {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (!match) return { stats: {}, found: false }

  try {
    const json = JSON.parse(match[1])
    // Explore common paths in Next.js pageProps
    const search = (obj: unknown, depth = 0): Record<string, number | string> | null => {
      if (depth > 8 || !obj || typeof obj !== 'object') return null
      const o = obj as Record<string, unknown>
      // Lolalytics stores stats under various keys — look for objects with winRate-like keys
      if (
        typeof o['win'] === 'number' || typeof o['winRate'] === 'number' ||
        typeof o['wr'] === 'number'  || typeof o['win_rate'] === 'number'
      ) return o as Record<string, number | string>
      for (const v of Object.values(o)) {
        const found = search(v, depth + 1)
        if (found) return found
      }
      return null
    }
    const data = search(json)
    if (data) return { stats: data, found: true }
  } catch { /* ignore */ }
  return { stats: {}, found: false }
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

  // Items
  const items: number[] = []
  $('img[src*="/item"]').each((_, el) => {
    const src = $(el).attr('src') ?? ''
    const m = src.match(/\/item(?:64|32|)?\/(\d+)(?:\.webp|\.png)?/)
    if (m && items.length < 6 && !items.includes(Number(m[1]))) {
      items.push(Number(m[1]))
    }
  })

  // Runes
  const runeList: number[] = []
  $('img[src*="/rune"]').each((_, el) => {
    const src = $(el).attr('src') ?? ''
    const m = src.match(/\/rune(?:68|32|)?\/(\d+)(?:\.webp|\.png)?/)
    const id = m ? Number(m[1]) : 0
    // Rune path IDs are 4-digit starting with 8000/8100/8200/8300/8400
    if (id >= 1000 && runeList.length < 20 && !runeList.includes(id)) runeList.push(id)
  })

  // Split rune list into paths + individual runes
  let primaryPath = 8000, secondaryPath = 8100
  let primaryRunes: number[] = [], secondaryRunes: number[] = [], shards: number[] = []

  if (runeList.length >= 2) {
    // First two matching path IDs are primary/secondary paths
    const pathIds = runeList.filter(id => RUNE_PATHS[id])
    if (pathIds.length >= 1) primaryPath = pathIds[0]
    if (pathIds.length >= 2) secondaryPath = pathIds[1]

    const runeIds = runeList.filter(id => !RUNE_PATHS[id])
    primaryRunes   = runeIds.slice(0, 4)
    secondaryRunes = runeIds.slice(4, 6)
    if (runeIds.length >= 9) shards = runeIds.slice(6, 9)
  }

  return { winRate, pickRate, banRate, tier, items, primaryPath, secondaryPath, primaryRunes, secondaryRunes, shards }
}

// ─── Main scrape function ─────────────────────────────────────────────────────
// Lolalytics no acepta ?patch= — lo ignora o devuelve 404.
// El parche activo lo determina el servidor automáticamente.
const LOLALYTICS_URLS = (champKey: string, lane: string) => [
  `https://lolalytics.com/lol/${champKey.toLowerCase()}/build/?lane=${lane}&tier=all`,
  `https://lolalytics.com/lol/${champKey.toLowerCase()}/build/?lane=${lane}`,
  `https://lolalytics.com/lol/${champKey.toLowerCase()}/`,
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

  // Try __NEXT_DATA__ first (much more reliable)
  const { found } = extractFromNextData(html)

  // Fall through to HTML scraping (works when Lolalytics does SSR)
  const scraped = scrapeHtml(html)

  const { winRate, pickRate, banRate, tier, items, primaryPath, secondaryPath, primaryRunes, secondaryRunes, shards } = scraped

  // Log what we found
  if (!winRate && !found) {
    console.warn(`[Lolalytics] ${champKey}/${lane}: no se extrajo win rate. La página puede requerir JS.`)
  }

  const roleMap = (Object.entries(LANE).find(([, v]) => v === lane)?.[0] ?? 'middle') as Role

  const stats: ChampionStats = {
    champKey,
    role: roleMap,
    patch: shortPatch,
    winRate:  winRate  || 0.495,  // fallback neutral
    pickRate: pickRate || 0.05,  // fallback: asume jugable en este rol
    banRate:  banRate  || 0,
    tier,
    matchups: []
  }

  const build: Build = {
    championId: 0,
    role: roleMap,
    items,
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
