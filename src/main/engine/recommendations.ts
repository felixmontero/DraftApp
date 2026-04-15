// Genera el top-5 de recomendaciones a partir del estado del draft

import type { DraftState, ChampionEntry, Recommendation } from '@shared/types'
import type { Role } from '@shared/constants'
import { fetchChampionStats } from '../data/lolalytics'
import { scoreChampion } from './scorer'

// Tags de Data Dragon que abarca cada rol (red amplia para pillar flex picks)
const ROLE_TAGS: Record<Role, string[]> = {
  top:     ['Fighter', 'Tank', 'Mage'],
  jungle:  ['Fighter', 'Assassin', 'Tank', 'Marksman'],
  middle:  ['Mage', 'Assassin', 'Fighter', 'Marksman'],
  bottom:  ['Marksman', 'Mage'],
  utility: ['Support', 'Tank', 'Mage']
}

const MAX_CANDIDATES = 35   // candidatos a evaluar por consulta
const CONCURRENT     = 8    // requests concurrentes a Lolalytics

export async function computeRecommendations(
  draft: DraftState,
  champions: ChampionEntry[],
  idMap: Record<number, string>,
  patch: string
): Promise<Recommendation[]> {

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

  // 3. Claves de campeones enemigos y aliados para counter/sinergia
  const enemyKeys = draft.theirTeam
    .filter(p => p.championId !== 0)
    .map(p => idMap[p.championId])
    .filter((k): k is string => Boolean(k))

  const allyKeys = draft.myTeam
    .filter(p => p.cellId !== draft.localPlayerCellId && p.championId !== 0)
    .map(p => idMap[p.championId])
    .filter((k): k is string => Boolean(k))

  // 4. Pool de candidatos: filtrado por rol y disponibilidad
  const roleTags  = ROLE_TAGS[role]
  const candidates = champions
    .filter(c => !unavailable.has(c.id))
    .filter(c => c.tags.some(t => roleTags.includes(t)))
    .slice(0, MAX_CANDIDATES)

  if (candidates.length === 0) return []

  // 5. Fetch stats en batches concurrentes (caché evita re-fetch en el mismo parche)
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

      // Descartar solo si wr es cero absoluto (dato corrupto)
      if (stats.winRate <= 0) continue

      const c = batch[j]
      scored.push(scoreChampion(
        stats,
        { id: c.id, key: c.key, name: c.name, iconUrl: `ddragon://${c.key}.png` },
        enemyKeys,
        allyKeys
      ))
    }
  }

  // 6. Ordenar y devolver top 5
  scored.sort((a, b) => b.score - a.score)
  console.log(`[Recs] ${scored.length} candidatos → top 5 para ${role}:`,
    scored.slice(0, 5).map(r => `${r.champion.key}(${r.score})`).join(', '))

  return scored.slice(0, 5)
}
