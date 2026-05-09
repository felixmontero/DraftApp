import { describe, expect, it } from 'vitest'
import type { ChampionStats } from '@shared/types'
import { scoreChampion } from './scorer'
import type { CompositionNeeds } from './composition'

const neutralNeeds: CompositionNeeds = {
  needsFrontline: false,
  needsAP: false,
  needsAD: false,
  needsPeel: false,
  allyDmg: { adCount: 1, apCount: 1, mixCount: 0, total: 2 },
  enemyDmg: { adCount: 1, apCount: 1, mixCount: 0, total: 2 },
  enemyHasEngageCC: false
}

function stats(overrides: Partial<ChampionStats>): ChampionStats {
  return {
    champKey: 'Malphite',
    role: 'top',
    patch: '16.7',
    winRate: 0.52,
    pickRate: 0.08,
    banRate: 0.02,
    tier: 'A',
    matchups: [],
    ...overrides
  }
}

describe('scoreChampion', () => {
  it('rewards favorable normalized counter matchups', () => {
    const rec = scoreChampion(
      stats({ champKey: 'Malphite' }),
      { id: 54, key: 'Malphite', name: 'Malphite', iconUrl: '' },
      ['Tank', 'Fighter'],
      ['Yasuo'],
      [],
      {},
      neutralNeeds,
      'mid'
    )

    expect(rec.breakdown.counterScore).toBeGreaterThan(0.5)
    expect(rec.reasons).toContain('Counter vs Yasuo')
  })

  it('shrinks low pick-rate win rates toward neutral', () => {
    const rec = scoreChampion(
      stats({ winRate: 0.58, pickRate: 0.005 }),
      { id: 1, key: 'Annie', name: 'Annie', iconUrl: '' },
      ['Mage'],
      [],
      [],
      {},
      neutralNeeds,
      'early'
    )

    expect(rec.breakdown.winRate).toBeLessThan(0.58)
    expect(rec.breakdown.winRate).toBeGreaterThan(0.5)
  })
})
