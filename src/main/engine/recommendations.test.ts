import { describe, expect, it, vi } from 'vitest'
import type { ChampionStats, DraftState, ChampionEntry } from '@shared/types'

vi.mock('../data/lolalytics', () => ({
  fetchChampionStats: vi.fn(async (champKey: string) => {
    const statsByKey: Record<string, Partial<ChampionStats>> = {
      MissFortune: { winRate: 0.526, pickRate: 0.12, banRate: 0.10, tier: 'S' },
      Jinx: { winRate: 0.519, pickRate: 0.09, banRate: 0.04, tier: 'A' },
      Draven: { winRate: 0.500, pickRate: 0.06, banRate: 0.02, tier: 'C' },
      Karthus: { winRate: 0.500, pickRate: 0.06, banRate: 0.02, tier: 'C' }
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
  { id: 119, key: 'Draven', name: 'Draven', tags: ['Marksman'] },
  { id: 30, key: 'Karthus', name: 'Karthus', tags: ['Mage'] },
  { id: 157, key: 'Yasuo', name: 'Yasuo', tags: ['Fighter', 'Assassin'] }
]

function draftWithAction(type: 'ban' | 'pick', enemyChampionId = 0): DraftState {
  return {
    localPlayerCellId: 1,
    myTeam: [
      { cellId: 1, championId: 0, assignedPosition: 'bottom', summonerId: 10 }
    ],
    theirTeam: enemyChampionId
      ? [{ cellId: 6, championId: enemyChampionId, assignedPosition: 'middle', summonerId: 20 }]
      : [],
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

  it('boosts ban candidates that complete enemy composition gaps', async () => {
    const recs = await computeRecommendations(
      draftWithAction('ban', 157),
      champions.filter(c => ['Draven', 'Karthus', 'Yasuo'].includes(c.key)),
      { 157: 'Yasuo' },
      '16.7.1'
    )

    expect(recs[0].champion.key).toBe('Karthus')
    expect(recs[0].reasons).toContain('Cubre AP rival')
    expect(recs[0].breakdown.synergyScore).toBeGreaterThan(recs[1].breakdown.synergyScore)
  })
})
