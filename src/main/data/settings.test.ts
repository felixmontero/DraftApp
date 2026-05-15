import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockStoreState = vi.hoisted(() => ({
  data: {} as Record<string, unknown>
}))

vi.mock('electron-store', () => ({
  default: class MockStore<T extends Record<string, unknown>> {
    constructor(options: { defaults: T }) {
      mockStoreState.data = structuredClone(options.defaults)
    }

    get<K extends keyof T>(key: K, fallback: T[K]): T[K] {
      return (mockStoreState.data[key as string] as T[K] | undefined) ?? fallback
    }

    set(key: string, value: unknown): void {
      const path = key.split('.')
      if (path.length === 1) {
        mockStoreState.data[key] = value
        return
      }
      let target = mockStoreState.data
      for (const part of path.slice(0, -1)) {
        target[part] = {
          ...(target[part] as Record<string, unknown> | undefined)
        }
        target = target[part] as Record<string, unknown>
      }
      target[path[path.length - 1]] = value
    }
  }
}))

describe('overlay settings', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('uses a full-size window as the default restore target', async () => {
    const { DEFAULT_WINDOW_BOUNDS, getSettings } = await import('./settings')

    expect(getSettings().overlay.windowBounds).toEqual(DEFAULT_WINDOW_BOUNDS)
  })

  it('migrates the obsolete compact-sized default when compact mode is off', async () => {
    const { DEFAULT_WINDOW_BOUNDS, getSettings, updateOverlaySettings } = await import('./settings')

    updateOverlaySettings({
      compactMode: false,
      windowBounds: { width: 390, height: 540 }
    })

    expect(getSettings().overlay.windowBounds).toEqual(DEFAULT_WINDOW_BOUNDS)
  })

  it('keeps a compact-sized saved window when compact mode is on', async () => {
    const { MIN_WINDOW_BOUNDS, getSettings, updateOverlaySettings } = await import('./settings')

    updateOverlaySettings({
      compactMode: true,
      windowBounds: { width: 390, height: 540 }
    })

    expect(getSettings().overlay.windowBounds).toEqual({ width: MIN_WINDOW_BOUNDS.width, height: 540 })
  })

  it('clamps saved bounds to the minimum supported size', async () => {
    const { MIN_WINDOW_BOUNDS, getSettings, updateOverlaySettings } = await import('./settings')

    updateOverlaySettings({
      windowBounds: { width: 500, height: 400 }
    })

    expect(getSettings().overlay.windowBounds).toEqual(MIN_WINDOW_BOUNDS)
  })
})
