import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockStoreState = vi.hoisted(() => ({
  data: {} as Record<string, unknown>
}))

vi.mock('electron-store', () => ({
  default: class MockStore {
    get(key: string, fallback: unknown): unknown {
      return mockStoreState.data[key] ?? fallback
    }

    set(key: string, value: unknown): void {
      mockStoreState.data[key] = value
    }

    delete(key: string): void {
      delete mockStoreState.data[key]
    }

    get store(): Record<string, unknown> {
      return mockStoreState.data
    }
  }
}))

describe('cache eviction', () => {
  beforeEach(async () => {
    vi.resetModules()
    mockStoreState.data = {}
  })

  it('keeps both full Data Dragon patch keys and short Lolalytics patch keys', async () => {
    const { cache } = await import('./cache')

    cache.set('champions:16.7.1', ['Ahri'])
    cache.set('rune-icons:16.7.1', { 8000: 'precision' })
    cache.set('stats:Ahri:middle:16.7', { winRate: 0.52 })
    cache.set('build:Ahri:middle:16.6', { items: [] })
    cache.set('champions:16.6.1', ['Old'])

    cache.evictOldPatch('16.7.1')

    expect(cache.get('champions:16.7.1')).toEqual(['Ahri'])
    expect(cache.get('rune-icons:16.7.1')).toEqual({ 8000: 'precision' })
    expect(cache.get('stats:Ahri:middle:16.7')).toEqual({ winRate: 0.52 })
    expect(cache.get('build:Ahri:middle:16.6')).toBeNull()
    expect(cache.get('champions:16.6.1')).toBeNull()
  })
})
