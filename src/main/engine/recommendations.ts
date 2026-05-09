// Genera el top-5 de recomendaciones a partir del estado del draft

import type { DraftState, ChampionEntry, Recommendation } from '@shared/types'
import type { Role } from '@shared/constants'
import { normalizeChampionKey } from '@shared/championKeys'
import { fetchChampionStats, fetchEnemyCounterData } from '../data/lolalytics'
import { scoreChampion, type DraftPhase } from './scorer'
import { hasStaticEntry, getStaticEntry } from '../data/tierlist'
import { analyzeComposition } from './composition'

const MAX_CANDIDATES = 50
const CONCURRENT     = 8
const TIER_ORDER: Record<string, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 }
const TIER_THREAT: Record<string, number> = { S: 1.0, A: 0.82, B: 0.62, C: 0.42, D: 0.22 }

function detectPhase(draft: DraftState): DraftPhase {
  const completedAlliedPicks = draft.actions.filter(
    a => a.type === 'pick' && a.isAllyAction && a.completed
  ).length
  if (completedAlliedPicks === 0) return 'early'
  if (completedAlliedPicks <= 2) return 'mid'
  return 'late'
}

function normalizeCounterMap(counterMap: Map<string, number>): Map<string, number> {
  return new Map(
    [...counterMap.entries()].map(([key, wr]) => [normalizeChampionKey(key), wr])
  )
}

function isAllyBanTurn(draft: DraftState): boolean {
  return draft.actions.some(a => a.type === 'ban' && a.isAllyAction && a.isInProgress)
}

function makeBanRecommendation(
  candidate: ChampionEntry,
  stats: Awaited<ReturnType<typeof fetchChampionStats>> | null,
  role: Role,
  allyKeys: string[],
  enemyKeys: string[]
): Recommendation {
  const staticEntry = getStaticEntry(candidate.key, role)
  const tier = stats?.tier ?? staticEntry?.tier ?? 'C'
  const rawWR = stats?.winRate ?? staticEntry?.winRate ?? 0.5
  const pickRate = stats?.pickRate ?? 0.04
  const banRate = stats?.banRate ?? 0

  const winRateScore = Math.max(0, Math.min(1, 0.5 + (rawWR - 0.5) * 8))
  const popularityScore = Math.max(0, Math.min(1, pickRate / 0.12))
  const banPressure = Math.max(0, Math.min(1, banRate / 0.18))
  const tierBonus = TIER_THREAT[tier] ?? 0.42

  const score = Math.round(
    (tierBonus * 0.42 + winRateScore * 0.28 + popularityScore * 0.18 + banPressure * 0.12) * 100
  )

  const reasons: string[] = []
  if (tier === 'S') reasons.push('Amenaza S-Tier')
  else if (tier === 'A') reasons.push('Amenaza A-Tier')
  if (rawWR >= 0.515) reasons.push(`WR ${(rawWR * 100).toFixed(1)}%`)
  if (pickRate >= 0.08) reasons.push('Alta presencia')
  if (banRate >= 0.08) reasons.push('Ban frecuente')
  if (allyKeys.length > 0 || enemyKeys.length > 0) reasons.push('Impacto alto en este draft')
  if (reasons.length === 0) reasons.push('Ban preventivo por rol')

  return {
    champion: {
      id: candidate.id,
      key: candidate.key,
      name: candidate.name,
      iconUrl: `ddragon://${candidate.key}.png`
    },
    score,
    breakdown: {
      winRate: rawWR,
      counterScore: banPressure,
      synergyScore: popularityScore,
      tierBonus
    },
    reasons: reasons.slice(0, 3)
  }
}

async function computeBanRecommendations(
  draft: DraftState,
  champions: ChampionEntry[],
  idMap: Record<number, string>,
  patch: string
): Promise<Recommendation[]> {
  const localPlayer = draft.myTeam.find(p => p.cellId === draft.localPlayerCellId)
  const role = localPlayer?.assignedPosition as Role | undefined
  if (!role) return []

  const unavailable = new Set<number>()
  for (const a of draft.actions) {
    if (a.championId !== 0) unavailable.add(a.championId)
  }
  for (const p of [...draft.myTeam, ...draft.theirTeam]) {
    if (p.championId !== 0) unavailable.add(p.championId)
  }

  const allyKeys = draft.myTeam
    .filter(p => p.championId !== 0)
    .map(p => idMap[p.championId])
    .filter((k): k is string => Boolean(k))

  const enemyKeys = draft.theirTeam
    .filter(p => p.championId !== 0)
    .map(p => idMap[p.championId])
    .filter((k): k is string => Boolean(k))

  const candidates = champions
    .filter(c => !unavailable.has(c.id))
    .filter(c => hasStaticEntry(c.key, role))
    .sort((a, b) => {
      const ea = getStaticEntry(a.key, role)
      const eb = getStaticEntry(b.key, role)
      const ta = TIER_ORDER[ea?.tier ?? 'D'] ?? 4
      const tb = TIER_ORDER[eb?.tier ?? 'D'] ?? 4
      if (ta !== tb) return ta - tb
      return (eb?.winRate ?? 0) - (ea?.winRate ?? 0)
    })
    .slice(0, MAX_CANDIDATES)

  const scored: Recommendation[] = []
  for (let i = 0; i < candidates.length; i += CONCURRENT) {
    const batch = candidates.slice(i, i + CONCURRENT)
    const results = await Promise.allSettled(
      batch.map(c => fetchChampionStats(c.key, role, patch))
    )

    for (let j = 0; j < batch.length; j++) {
      const result = results[j]
      const stats = result.status === 'fulfilled' ? result.value : null
      scored.push(makeBanRecommendation(batch[j], stats, role, allyKeys, enemyKeys))
    }
  }

  scored.sort((a, b) => b.score - a.score)
  console.log(
    `[Bans] ${scored.length} candidatos -> top 5 para ${role}:`,
    scored.slice(0, 5).map(r => `${r.champion.key}(${r.score})`).join(', ')
  )
  return scored.slice(0, 5)
}

export async function computeRecommendations(
  draft: DraftState,
  champions: ChampionEntry[],
  idMap: Record<number, string>,
  patch: string
): Promise<Recommendation[]> {
  if (isAllyBanTurn(draft)) {
    return computeBanRecommendations(draft, champions, idMap, patch)
  }

  // 1. Rol del jugador local
  const localPlayer = draft.myTeam.find(p => p.cellId === draft.localPlayerCellId)
  const role = localPlayer?.assignedPosition as Role | undefined
  if (!role) return []

  // 2. IDs no disponibles (banes completados + picks ya confirmados)
  const unavailable = new Set<number>()
  for (const a of draft.actions) {
    if (a.completed && a.championId !== 0) unavailable.add(a.championId)
  }
  for (const p of [...draft.myTeam, ...draft.theirTeam]) {
    if (p.championId !== 0) unavailable.add(p.championId)
  }

  // 3. Claves de campeones enemigos y aliados
  const enemyKeys = draft.theirTeam
    .filter(p => p.championId !== 0)
    .map(p => idMap[p.championId])
    .filter((k): k is string => Boolean(k))

  const allyKeys = draft.myTeam
    .filter(p => p.cellId !== draft.localPlayerCellId && p.championId !== 0)
    .map(p => idMap[p.championId])
    .filter((k): k is string => Boolean(k))

  // 4. Fase del draft y análisis de composición
  const phase = detectPhase(draft)
  const compositionNeeds = analyzeComposition(allyKeys, enemyKeys, champions)

  // 5. Fetch paralelo de datos de counters por cada campeón enemigo visible
  const counterData: Record<string, Map<string, number>> = {}
  if (enemyKeys.length > 0) {
    const counterResults = await Promise.allSettled(
      enemyKeys.map(ek => fetchEnemyCounterData(ek, role, patch))
    )
    enemyKeys.forEach((ek, i) => {
      const r = counterResults[i]
      const normalizedMap = r.status === 'fulfilled' ? normalizeCounterMap(r.value) : new Map()
      counterData[ek] = normalizedMap
      counterData[normalizeChampionKey(ek)] = normalizedMap
    })
  }

  // 6. Pool de candidatos: filtrado por rol, ordenado por tier, top MAX_CANDIDATES
  const candidates = champions
    .filter(c => !unavailable.has(c.id))
    .filter(c => hasStaticEntry(c.key, role))
    .sort((a, b) => {
      const ta = getStaticEntry(a.key, role)?.tier ?? 'D'
      const tb = getStaticEntry(b.key, role)?.tier ?? 'D'
      return (TIER_ORDER[ta] ?? 4) - (TIER_ORDER[tb] ?? 4)
    })
    .slice(0, MAX_CANDIDATES)

  if (candidates.length === 0) return []

  // 7. Fetch stats en batches concurrentes
  const scored: Recommendation[] = []

  for (let i = 0; i < candidates.length; i += CONCURRENT) {
    const batch = candidates.slice(i, i + CONCURRENT)
    const results = await Promise.allSettled(
      batch.map(c => fetchChampionStats(c.key, role, patch))
    )

    for (let j = 0; j < batch.length; j++) {
      const r = results[j]
      if (r.status !== 'fulfilled' || !r.value) continue
      const stats = r.value
      if (stats.winRate <= 0) continue

      const c = batch[j]
      scored.push(scoreChampion(
        stats,
        { id: c.id, key: c.key, name: c.name, iconUrl: `ddragon://${c.key}.png` },
        c.tags,
        enemyKeys,
        allyKeys,
        counterData,
        compositionNeeds,
        phase
      ))
    }
  }

  // 8. Ordenar y devolver top 5
  scored.sort((a, b) => b.score - a.score)
  console.log(
    `[Recs] fase=${phase} ${scored.length} candidatos → top 5 para ${role}:`,
    scored.slice(0, 5).map(r => `${r.champion.key}(${r.score})`).join(', ')
  )

  return scored.slice(0, 5)
}
