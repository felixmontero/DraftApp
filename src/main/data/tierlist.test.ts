import { describe, expect, it } from 'vitest'
import { getStaticEntry, getStaticMatchupWr, hasStaticEntry } from './tierlist'

describe('static tierlist normalization', () => {
  it('finds static entries through normalized aliases', () => {
    expect(hasStaticEntry("Cho'Gath", 'top')).toBe(true)
    expect(getStaticEntry('LeBlanc', 'middle')?.tier).toBe('B')
    expect(getStaticEntry('KaiSa', 'bottom')?.tier).toBe('A')
  })

  it('scores normalized static counters in both directions', () => {
    expect(getStaticMatchupWr('Malphite', 'Yasuo')).toBeGreaterThan(0.5)
    expect(getStaticMatchupWr('Yasuo', 'Malphite')).toBeLessThan(0.5)
    expect(getStaticMatchupWr('Aatrox', 'Ahri')).toBe(0.5)
  })
})
