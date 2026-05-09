import { describe, expect, it, vi } from 'vitest'
import type { ChampionStats, DraftState, ChampionEntry } from '@shared/types'

vi.mock('../data/lolalytics', () => ({
  fetchChampionStats: vi.fn(async (champKey: string) => {
    const statsByKey: Record<string, Partial<ChampionStats>> = {
      MissFortune: { winRate: 0.526, pickRate: 0.12, banRate: 0.10, tier: 'S' },
      Jinx: { winRate: 0.519, pickRate: 0.09, banRate: 0.04, tier: 'A' },
      Draven: { winRate: 0.494, pickRate: 0.08, banRate: 0.09, tier: 'B' }
    }
    const overrides = statsByKey[champKey]
    if (!overrides) return null
    return {
      champKey,
      role: 'bottom',
      patch: '16.7',
      winRate: 0.5,
      pickRate: 0.04,
      banRate: 0,
      tier: 'C',
      matchups: [],
      ...overrides
    } satisfies ChampionStats
  }),
  fetchEnemyCounterData: vi.fn(async () => new Map<string, number>())
}))

import { computeRecommendations } from './recommendations'

const champions: ChampionEntry[] = [
  { id: 21, key: 'MissFortune', name: 'Miss Fortune', tags: ['Marksman'] },
  { id: 222, key: 'Jinx', name: 'Jinx', tags: ['Marksman'] },
  { id: 119, key: 'Draven', name: 'Draven', tags: ['Marksman'] }
]

function draftWithAction(type: 'ban' | 'pick'): DraftState {
  return {
    localPlayerCellId: 1,
    myTeam: [
      { cellId: 1, championId: 0, assignedPosition: 'bottom', summonerId: 10 }
    ],
    theirTeam: [],
    actions: [
      { id: 1, type, championId: 0, completed: false, isAllyAction: true, isInProgress: true }
    ],
    phase: 'BAN_PICK',
    timeLeftMs: 25000
  }
}

describe('computeRecommendations', () => {
  it('returns threat bans during ally ban turn', async () => {
    const recs = await computeRecommendations(draftWithAction('ban'), champions, {}, '16.7.1')

    expect(recs[0].champion.key).toBe('MissFortune')
    expect(recs[0].reasons).toContain('Amenaza S-Tier')
  })
})
