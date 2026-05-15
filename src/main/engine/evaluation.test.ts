import { describe, expect, it, vi } from 'vitest'
import type { ChampionEntry, ChampionStats, DraftState, Recommendation } from '@shared/types'

vi.mock('../data/lolalytics', () => ({
  fetchChampionStats: vi.fn(async (champKey: string) => {
    const statsByKey: Record<string, Partial<ChampionStats>> = {
      MissFortune: { winRate: 0.526, pickRate: 0.12, banRate: 0.10, tier: 'S' },
      Jinx: { winRate: 0.519, pickRate: 0.09, banRate: 0.04, tier: 'A' },
      Karthus: { winRate: 0.512, pickRate: 0.05, banRate: 0.03, tier: 'A' },
      Draven: { winRate: 0.500, pickRate: 0.06, banRate: 0.02, tier: 'C' }
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

import { evaluateRecommendations, formatEvaluationSummary, runDraftEvaluation } from './evaluation'

const champions: ChampionEntry[] = [
  { id: 21, key: 'MissFortune', name: 'Miss Fortune', tags: ['Marksman'] },
  { id: 222, key: 'Jinx', name: 'Jinx', tags: ['Marksman'] },
  { id: 30, key: 'Karthus', name: 'Karthus', tags: ['Mage'] },
  { id: 119, key: 'Draven', name: 'Draven', tags: ['Marksman'] }
]

function draft(type: 'pick' | 'ban'): DraftState {
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

function rec(key: string): Recommendation {
  return {
    champion: { id: key.length, key, name: key, iconUrl: '' },
    score: 80,
    breakdown: { winRate: 0.52, counterScore: 0.5, synergyScore: 0.5, tierBonus: 0.8 },
    reasons: []
  }
}

describe('draft recommendation evaluation', () => {
  it('evaluates expected champions inside the configured top rank', () => {
    const result = evaluateRecommendations(
      { id: 'case-1', label: 'MF expected', draft: draft('pick'), expectedTopKeys: ['MissFortune'], maxRank: 2 },
      [rec('Jinx'), rec('MissFortune'), rec('Draven')]
    )

    expect(result.passed).toBe(true)
    expect(result.topKeys).toEqual(['Jinx', 'MissFortune'])
    expect(result.missingKeys).toEqual([])
  })

  it('reports misses clearly', () => {
    const result = evaluateRecommendations(
      { id: 'case-2', label: 'Karthus expected', draft: draft('pick'), expectedTopKeys: ['Karthus'], maxRank: 2 },
      [rec('Jinx'), rec('MissFortune'), rec('Draven')]
    )

    expect(result.passed).toBe(false)
    expect(result.missingKeys).toEqual(['karthus'])
  })

  it('runs a local draft evaluation set against the recommendation engine', async () => {
    const summary = await runDraftEvaluation(
      [
        { id: 'bottom-pick-meta', label: 'Prioriza ADC meta', draft: draft('pick'), expectedTopKeys: ['MissFortune'], maxRank: 3 },
        { id: 'bottom-ban-threat', label: 'Prioriza amenaza de ban', draft: draft('ban'), expectedTopKeys: ['MissFortune'], maxRank: 1 }
      ],
      champions,
      {},
      '16.7.1'
    )

    expect(summary.total).toBe(2)
    expect(summary.failed).toBe(0)
    expect(formatEvaluationSummary(summary)).toContain('2/2 passed')
  })
})
