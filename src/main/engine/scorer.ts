// Motor de scoring de campeones
// score = winRate*0.30 + counterScore*0.35 + synergyScore*0.20 + tierBonus*0.15

import type { ChampionStats, Recommendation, Champion, Tier } from '@shared/types'

const TIER_BONUS: Record<Tier, number> = { S: 1.0, A: 0.8, B: 0.6, C: 0.4, D: 0.2 }

export function scoreChampion(
  stats: ChampionStats,
  champion: Champion,
  enemyKeys: string[],
  _allyKeys: string[]
): Recommendation {
  // ── Win rate (0–1) ────────────────────────────────────────────────────────
  const winRate = Math.max(0, Math.min(1, stats.winRate))

  // ── Counter score ─────────────────────────────────────────────────────────
  // matchups[i].winRate = win rate de ESTE campeón jugando contra matchup.champKey
  let counterScore = 0.5
  if (enemyKeys.length > 0) {
    const wrs = enemyKeys.map(ek => {
      const m = stats.matchups.find(m => m.champKey.toLowerCase() === ek.toLowerCase())
      return m ? m.winRate : 0.5  // sin datos → neutral
    })
    counterScore = wrs.reduce((a, b) => a + b, 0) / wrs.length
  }

  // ── Synergy score ─────────────────────────────────────────────────────────
  // Sin datos cruzados de sinergia desde Lolalytics → baseline 0.5
  const synergyScore = 0.5

  // ── Tier bonus (0–1) ──────────────────────────────────────────────────────
  const tierBonus = TIER_BONUS[stats.tier] ?? 0.4

  // ── Score final 0–100 ─────────────────────────────────────────────────────
  const score = Math.round(
    (winRate * 0.30 + counterScore * 0.35 + synergyScore * 0.20 + tierBonus * 0.15) * 100
  )

  // ── Razones legibles ──────────────────────────────────────────────────────
  const reasons: string[] = []

  if (stats.tier === 'S')      reasons.push('S-Tier este parche')
  else if (stats.tier === 'A') reasons.push('A-Tier este parche')

  if (stats.winRate >= 0.525)  reasons.push(`Win rate ${(stats.winRate * 100).toFixed(1)}%`)

  for (const ek of enemyKeys) {
    const m = stats.matchups.find(m => m.champKey.toLowerCase() === ek.toLowerCase())
    if (m && m.winRate >= 0.53)  reasons.push(`Counter vs ${ek}`)
    else if (m && m.winRate <= 0.47) reasons.push(`Débil vs ${ek}`)
  }

  if (reasons.length === 0) reasons.push('Pick consistente')

  return {
    champion,
    score,
    breakdown: { winRate, counterScore, synergyScore, tierBonus },
    reasons: reasons.slice(0, 3)
  }
}
