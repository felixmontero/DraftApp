// Motor de scoring de campeones
// Pesos dinámicos según fase del draft:
//   early : winRate×0.35 + counter×0.20 + synergy×0.30 + tier×0.15
//   mid   : winRate×0.30 + counter×0.35 + synergy×0.20 + tier×0.15
//   late  : winRate×0.22 + counter×0.48 + synergy×0.20 + tier×0.10

import type { ChampionStats, Recommendation, Champion, Tier } from '@shared/types'
import { normalizeChampionKey } from '@shared/championKeys'
import { getStaticMatchupWr } from '../data/tierlist'
import { compositionScore, getDamageType, type CompositionNeeds } from './composition'

export type DraftPhase = 'early' | 'mid' | 'late'

const TIER_BONUS: Record<Tier, number> = { S: 1.0, A: 0.8, B: 0.6, C: 0.4, D: 0.2 }

const PHASE_WEIGHTS: Record<DraftPhase, [number, number, number, number]> = {
  //                              WR    counter  synergy  tier
  early: [0.35, 0.20, 0.30, 0.15],
  mid:   [0.30, 0.35, 0.20, 0.15],
  late:  [0.22, 0.48, 0.20, 0.10],
}

function liveCounterWr(
  counterData: Record<string, Map<string, number>>,
  enemyKey: string,
  candidateKey: string
): number | undefined {
  const normalizedEnemy = normalizeChampionKey(enemyKey)
  const normalizedCandidate = normalizeChampionKey(candidateKey)
  const data = counterData[enemyKey] ?? counterData[normalizedEnemy]
  return data?.get(candidateKey)
      ?? data?.get(candidateKey.toLowerCase())
      ?? data?.get(normalizedCandidate)
      ?? data?.get(normalizedCandidate.toLowerCase())
}

export function scoreChampion(
  stats: ChampionStats,
  champion: Champion,
  candidateTags: string[],
  enemyKeys: string[],
  allyKeys: string[],
  // counterData[enemyKey] → Map<candidateKey, wrFromCandidatePerspective>
  counterData: Record<string, Map<string, number>>,
  compositionNeeds: CompositionNeeds,
  phase: DraftPhase
): Recommendation {
  void allyKeys  // usado en compositionNeeds

  const [wWR, wCounter, wSynergy, wTier] = PHASE_WEIGHTS[phase]

  // ── Win rate ajustado por pick rate (corrección OTP) ─────────────────────
  // Campeones con pick rate muy bajo tienen WR inflado por OTPs.
  // Shrinkage hacia la media (0.5) proporcional a la falta de pick rate.
  // referenceRate = 0.05 (5%): por debajo de eso, menor confianza en el WR.
  const REFERENCE_PICK_RATE = 0.05
  const confidence = Math.min(1, (stats.pickRate || 0.005) / REFERENCE_PICK_RATE)
  const rawWR = Math.max(0, Math.min(1, stats.winRate))
  const winRate = 0.5 + (rawWR - 0.5) * confidence

  // ── Counter score ─────────────────────────────────────────────────────────
  // Prioridad: datos live de Lolalytics; fallback tabla estática; último neutral
  let counterScore = 0.5
  if (enemyKeys.length > 0) {
    const wrs = enemyKeys.map(ek => {
      // 1. Datos live del scraping de counters
      const liveWr = liveCounterWr(counterData, ek, champion.key)
      if (liveWr !== undefined) return liveWr

      // 2. Datos live del propio stats.matchups (si algún día se populan)
      const m = stats.matchups.find(m => normalizeChampionKey(m.champKey) === normalizeChampionKey(ek))
      if (m) return m.winRate

      // 3. Tabla estática
      return getStaticMatchupWr(champion.key, ek)
    })
    counterScore = wrs.reduce((a, b) => a + b, 0) / wrs.length
  }

  // ── Synergy / composition score (0.25–0.75) ──────────────────────────────
  const synergyScore = compositionScore(champion.key, candidateTags, compositionNeeds)

  // ── Tier bonus (0–1) ──────────────────────────────────────────────────────
  const tierBonus = TIER_BONUS[stats.tier] ?? 0.4

  // ── Score final 0–100 ─────────────────────────────────────────────────────
  const score = Math.round(
    (winRate * wWR + counterScore * wCounter + synergyScore * wSynergy + tierBonus * wTier) * 100
  )

  // ── Razones legibles ──────────────────────────────────────────────────────
  const reasons: string[] = []

  if (stats.tier === 'S')      reasons.push('S-Tier este parche')
  else if (stats.tier === 'A') reasons.push('A-Tier este parche')

  if (winRate >= 0.520)  reasons.push(`WR ${(rawWR * 100).toFixed(1)}%${confidence < 0.6 ? ' (nicho)' : ''}`)

  for (const ek of enemyKeys) {
    const liveWr = liveCounterWr(counterData, ek, champion.key)
    const wr = liveWr ?? getStaticMatchupWr(champion.key, ek)
    if (wr >= 0.53)      reasons.push(`Counter vs ${ek}`)
    else if (wr <= 0.47) reasons.push(`Débil vs ${ek}`)
  }

  // Razones de composición (usando tipo de daño real, no solo tags)
  const { needsFrontline, needsAP, needsAD, needsPeel, allyDmg } = compositionNeeds
  const has = (t: string) => candidateTags.includes(t)
  const candidateDmg = getDamageType(champion.key, candidateTags)
  const candidateIsAP = candidateDmg === 'AP' || candidateDmg === 'MIX'
  const candidateIsAD = candidateDmg === 'AD' || candidateDmg === 'MIX'

  if (needsFrontline && (has('Tank') || has('Fighter')))  reasons.push('Frontline necesaria')
  if (needsPeel      && has('Support'))                   reasons.push('Peel/enchanter necesario')
  if (needsAP && candidateIsAP)                           reasons.push('Equipo sin daño AP')
  else if (needsAD && candidateIsAD)                      reasons.push('Equipo sin daño AD')
  else if (allyDmg.total >= 2 && allyDmg.apCount / allyDmg.total < 0.30 && candidateIsAP)
                                                          reasons.push('Equilibra daño AP del equipo')

  if (phase === 'early' && reasons.length === 0) reasons.push('Pick seguro fase temprana')
  if (reasons.length === 0)                      reasons.push('Pick consistente')

  return {
    champion,
    score,
    breakdown: { winRate, counterScore, synergyScore, tierBonus },
    reasons: reasons.slice(0, 3)
  }
}
