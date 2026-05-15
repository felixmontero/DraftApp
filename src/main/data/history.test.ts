import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DraftHistoryEntry } from '@shared/types'

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

    set<K extends keyof T>(key: K, value: T[K]): void {
      mockStoreState.data[key as string] = value
    }
  }
}))

function entry(id: string, timestamp = Date.now()): DraftHistoryEntry {
  return {
    id,
    timestamp,
    patch: '16.7.1',
    draft: {
      localPlayerCellId: 0,
      myTeam: [
        { cellId: 0, championId: 103, assignedPosition: 'middle', summonerId: 10 }
      ],
      theirTeam: [],
      actions: [
        { id: 1, type: 'pick', championId: 103, completed: true, isAllyAction: true, isInProgress: false }
      ],
      phase: 'BAN_PICK',
      timeLeftMs: 10000
    },
    recommendations: []
  }
}

function emptyEntry(id: string): DraftHistoryEntry {
  return {
    ...entry(id),
    draft: {
      localPlayerCellId: 0,
      myTeam: [
        { cellId: 0, championId: 0, assignedPosition: 'middle', summonerId: 10 }
      ],
      theirTeam: [],
      actions: [],
      phase: 'BAN_PICK',
      timeLeftMs: 10000
    }
  }
}

describe('draft history storage', () => {
  beforeEach(async () => {
    vi.resetModules()
  })

  it('stores newest drafts first and caps history at 50 entries', async () => {
    const { getHistory, saveDraftToHistory } = await import('./history')

    for (let i = 0; i < 55; i += 1) {
      saveDraftToHistory(entry(`draft-${i}`, i))
    }

    const history = getHistory()
    expect(history).toHaveLength(50)
    expect(history[0].id).toBe('draft-54')
    expect(history[49].id).toBe('draft-5')
  })

  it('ignores duplicate draft ids', async () => {
    const { getHistory, saveDraftToHistory } = await import('./history')

    saveDraftToHistory(entry('same-draft', 1))
    saveDraftToHistory(entry('same-draft', 2))

    expect(getHistory()).toHaveLength(1)
    expect(getHistory()[0].timestamp).toBe(1)
  })

  it('does not store empty drafts without selected champions', async () => {
    const { getHistory, saveDraftToHistory } = await import('./history')

    saveDraftToHistory(emptyEntry('empty-draft'))

    expect(getHistory()).toEqual([])
  })

  it('does not store drafts that only contain hovered champions', async () => {
    const { getHistory, saveDraftToHistory } = await import('./history')

    saveDraftToHistory({
      ...emptyEntry('hover-draft'),
      draft: {
        localPlayerCellId: 0,
        myTeam: [
          { cellId: 0, championId: 103, assignedPosition: 'middle', summonerId: 10 }
        ],
        theirTeam: [],
        actions: [],
        phase: 'BAN_PICK',
        timeLeftMs: 10000
      }
    })

    expect(getHistory()).toEqual([])
  })

  it('deletes individual entries and clears all history', async () => {
    const { clearHistory, deleteHistoryEntry, getHistory, saveDraftToHistory } = await import('./history')

    saveDraftToHistory(entry('a'))
    saveDraftToHistory(entry('b'))
    deleteHistoryEntry('a')

    expect(getHistory().map(item => item.id)).toEqual(['b'])

    clearHistory()
    expect(getHistory()).toEqual([])
  })
})
