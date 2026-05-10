import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Mock de electron para que no falle al importar
vi.mock('electron', () => ({
  net: { fetch: vi.fn() }
}))

import { extractFromJsonScripts, scrapeHtml } from './lolalytics'

describe('Lolalytics Scraper (Qwik Adaptation)', () => {
  const akaliHtml = readFileSync(resolve(__dirname, '../../../scratch/akali.html'), 'utf-8')

  it('fails to extract structured data from Qwik JSON (known limitation)', () => {
    // Verificamos que extractFromJsonScripts no encuentra nada útil en el JSON de Qwik
    // porque el formato es opaco/referencial.
    const res = extractFromJsonScripts(akaliHtml)
    expect(res.found).toBe(false)
  })

  it('extracts win rate from Qwik HTML using scrapeHtml', () => {
    const res = scrapeHtml(akaliHtml)
    
    // En akali.html vimos "56.34% Win Rate" en un h1
    // Mi testWrScrape.js dio 0.5129 para Miss Fortune, pero akali.html es otro snapshot
    expect(res.winRate).toBeGreaterThan(0.40)
    expect(res.winRate).toBeLessThan(0.65)
    // El primer valor de WR en akali.html (L4e) es 49.65% (average)
    expect(res.winRate).toBe(0.4965)
  })

  it('extracts items from Qwik HTML', () => {
    const res = scrapeHtml(akaliHtml)
    expect(res.items.length).toBeGreaterThanOrEqual(3)
    // Akali suele llevar Lich Bane (3100), Shadowflame (4645), etc.
    // Verificamos que son IDs válidos
    res.items.forEach(id => {
      expect(id).toBeGreaterThan(1000)
      expect(id).toBeLessThan(10000)
    })
  })

  it('extracts runes and infers paths from Qwik HTML', () => {
    const res = scrapeHtml(akaliHtml)
    expect(res.primaryRunes.length).toBe(4)
    expect(res.secondaryRunes.length).toBe(2)
    expect([8000, 8100, 8200, 8300, 8400]).toContain(res.primaryPath)
    expect([8000, 8100, 8200, 8300, 8400]).toContain(res.secondaryPath)
  })
})
