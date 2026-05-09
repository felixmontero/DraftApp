import { describe, expect, it } from 'vitest'
import { normalizeChampionKey, sameChampionKey } from './championKeys'

describe('champion key normalization', () => {
  it('normalizes punctuation and common Data Dragon aliases', () => {
    expect(normalizeChampionKey("Kai'Sa")).toBe('Kaisa')
    expect(normalizeChampionKey('KhaZix')).toBe('Khazix')
    expect(normalizeChampionKey("Cho'Gath")).toBe('Cho')
    expect(normalizeChampionKey('LeBlanc')).toBe('Leblanc')
  })

  it('compares equivalent champion keys', () => {
    expect(sameChampionKey('VelKoz', 'Vel')).toBe(true)
    expect(sameChampionKey('NunuWillump', 'Nunu')).toBe(true)
    expect(sameChampionKey('Aatrox', 'Ahri')).toBe(false)
  })
})
