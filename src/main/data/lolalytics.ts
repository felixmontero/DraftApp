// Fase 3 — Lolalytics: win rates, matchups, builds
// Un solo request por campeón/rol → parsea stats Y build, cachea ambos

import axios from 'axios'
import type { ChampionStats, Build, Tier, Matchup, Role } from '@shared/types'
import { cache, keys } from './cache'

// ─── Mapeo de roles LoL → lanes de Lolalytics ────────────────────────────────
const LANE: Record<Role, string> = {
  top:     'top',
  jungle:  'jungle',
  middle:  'mid',
  bottom:  'adc',
  utility: 'support'
}

// El API de Lolalytics está en axe.lolalytics.com (distinto del site público)
const API_BASE = 'https://axe.lolalytics.com'

const TIMEOUT = 12_000
// Headers que imitan un navegador real (necesarios para que no devuelva 403/404)
const HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept':          'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Origin':          'https://lolalytics.com',
  'Referer':         'https://lolalytics.com/',
  'sec-fetch-site':  'same-site',
  'sec-fetch-mode':  'cors',
  'sec-fetch-dest':  'empty'
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** "16.7.1" → "16.7" (formato que usa Lolalytics) */
export function toShortPatch(patch: string): string {
  const [major, minor] = patch.split('.')
  return `${major}.${minor}`
}

function normalizeTier(raw: unknown): Tier {
  if (typeof raw === 'string') {
    const t = raw.toUpperCase()
    if (['S', 'A', 'B', 'C', 'D'].includes(t)) return t as Tier
  }
  if (typeof raw === 'number') {
    const tiers: Tier[] = ['S', 'A', 'B', 'C', 'D']
    return tiers[Math.min(Math.max(raw - 1, 0), 4)]
  }
  return 'C'
}

function normalizeRate(raw: unknown): number {
  const n = Number(raw)
  if (isNaN(n)) return 0
  return n > 1 ? n / 100 : n   // Lolalytics a veces devuelve 0-100
}

// ─── Fetch + parse combinado ──────────────────────────────────────────────────

interface LolalyticsRaw {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any
}

// Variantes de URL a probar en orden hasta que una funcione
function buildUrls(champKey: string, lane: string, shortPatch: string): string[] {
  const base = `${API_BASE}/mega/?ep=champion&p=d&v=1`
  return [
    `${base}&lane=${lane}&tier=all&queue=ranked&patch=${shortPatch}&c=${champKey}`,
    `${base}&lanes=${lane}&tier=all&queue=ranked&patch=${shortPatch}&c=${champKey}`,
    `${base}&lane=${lane}&tier=all&queue=420&patch=${shortPatch}&c=${champKey}`,
    `${base}&lane=default&tier=all&queue=ranked&patch=${shortPatch}&c=${champKey}`,
  ]
}

// Control para loguear la respuesta completa solo en el primer fallo (debug)
let _firstErrorLogged = false

async function fetchRaw(champKey: string, lane: string, shortPatch: string): Promise<LolalyticsRaw | null> {
  const urls = buildUrls(champKey, lane, shortPatch)

  for (const url of urls) {
    try {
      const { data } = await axios.get<LolalyticsRaw>(url, { timeout: TIMEOUT, headers: HEADERS })
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        return data
      }
    } catch (err: unknown) {
      const axErr = err as { response?: { status: number; data?: unknown }; message: string }
      const status  = axErr.response?.status
      const body    = axErr.response?.data

      // En el primer error, loguear la respuesta completa para ayudar a depurar
      if (!_firstErrorLogged) {
        _firstErrorLogged = true
        console.warn(`[Lolalytics][DEBUG] URL probada: ${url}`)
        console.warn(`[Lolalytics][DEBUG] Status: ${status} | Body: ${JSON.stringify(body)?.slice(0, 300)}`)
        console.warn(`[Lolalytics][DEBUG] Si ves este error, abre lolalytics.com en el navegador,`)
        console.warn(`[Lolalytics][DEBUG] ve a DevTools → Network → filtra por Fetch/XHR y copia`)
        console.warn(`[Lolalytics][DEBUG] la URL de la primera llamada API que aparezca.`)
      }

      if (status && status !== 404 && status !== 403) break  // error inesperado, no reintentar
    }
  }

  console.warn(`[Lolalytics] ${champKey}/${lane}: no se pudo obtener datos (404/403 en todas las variantes)`)
  return null
}

function parseStats(data: LolalyticsRaw, champKey: string, role: Role, shortPatch: string): ChampionStats {
  const n  = Number(data.n  ?? 1) || 1
  const wr = Number(data.wr ?? 0)

  // Matchups: acepta tanto { ChampName: { n, wr } } como { ChampName: [n, wr] }
  const rawMatchups: Record<string, unknown> = data.counters ?? data.matchups ?? {}
  const matchups: Matchup[] = []

  for (const [name, val] of Object.entries(rawMatchups)) {
    let mGames = 0, mWins = 0
    if (Array.isArray(val)) {
      mGames = Number(val[0]) || 0
      mWins  = Number(val[1]) || 0
    } else if (val && typeof val === 'object') {
      const v = val as Record<string, unknown>
      mGames = Number(v.n ?? v.games ?? 0) || 0
      mWins  = Number(v.wr ?? v.wins  ?? 0) || 0
    }
    if (mGames >= 50) {
      matchups.push({ champKey: name, winRate: mWins / mGames, games: mGames })
    }
  }
  matchups.sort((a, b) => b.games - a.games)

  return {
    champKey,
    role,
    patch: shortPatch,
    winRate:  wr / n,
    pickRate: normalizeRate(data.pr),
    banRate:  normalizeRate(data.br),
    tier:     normalizeTier(data.tier),
    matchups: matchups.slice(0, 30)
  }
}

function parseBuild(data: LolalyticsRaw, role: Role): Build {
  // ── Items ──────────────────────────────────────────────────────────────────
  // Lolalytics puede entregar itemSets, items, o build.core como objetos/arrays
  const items: number[] = []
  const rawItems: Record<string, unknown> = data.itemSets ?? data.items ?? {}
  for (const [id] of Object.entries(rawItems)) {
    const numId = parseInt(id, 10)
    if (!isNaN(numId) && numId >= 1000) {
      items.push(numId)
      if (items.length >= 6) break
    }
  }

  // ── Runas ──────────────────────────────────────────────────────────────────
  let primaryPath  = 8000
  let secondaryPath = 8100
  let primaryRunes: number[]   = []
  let secondaryRunes: number[] = []
  let shards: number[]          = []

  const rawRunes = data.runes ?? {}
  if (rawRunes.perks && Array.isArray(rawRunes.perks)) {
    primaryPath   = Number(rawRunes.primaryStyle ?? 8000)
    secondaryPath = Number(rawRunes.subStyle     ?? 8100)
    // perks puede ser array de números o de objetos { perk, var1, … }
    const ids: number[] = rawRunes.perks.map((p: unknown) =>
      typeof p === 'number' ? p : Number((p as Record<string, unknown>).perk ?? 0)
    )
    primaryRunes   = ids.slice(0, 4)
    secondaryRunes = ids.slice(4, 6)
    shards         = ids.slice(6, 9)
  } else if (Array.isArray(rawRunes) && rawRunes.length >= 4) {
    // Formato alternativo: [primaryStyle, subStyle, perk1, perk2, …]
    primaryPath    = Number(rawRunes[0])
    secondaryPath  = Number(rawRunes[1])
    primaryRunes   = (rawRunes as number[]).slice(2, 6)
    secondaryRunes = (rawRunes as number[]).slice(6, 8)
    shards         = (rawRunes as number[]).slice(8, 11)
  }

  return {
    championId: 0,  // Se rellena en la capa superior si hace falta
    role,
    items,
    runes: { primaryPath, primaryRunes, secondaryPath, secondaryRunes, shards }
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Obtiene stats Y build de un campeón para un rol dado.
 * Un solo HTTP request → cachea ambos resultados por separado.
 */
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

  const data = await fetchRaw(champKey, LANE[role], shortPatch)
  if (!data) return { stats: null, build: null }

  const stats = parseStats(data, champKey, role, shortPatch)
  const build = parseBuild(data, role)

  cache.set(sKey, stats)
  cache.set(bKey, build)
  console.log(`[Lolalytics] ${champKey}/${role} → WR ${(stats.winRate * 100).toFixed(1)}% tier ${stats.tier}`)

  return { stats, build }
}

export async function fetchChampionStats(champKey: string, role: Role, patch: string): Promise<ChampionStats | null> {
  return (await fetchChampionData(champKey, role, patch)).stats
}

export async function fetchChampionBuild(champKey: string, role: Role, patch: string): Promise<Build | null> {
  return (await fetchChampionData(champKey, role, patch)).build
}
