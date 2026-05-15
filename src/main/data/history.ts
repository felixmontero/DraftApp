import Store from 'electron-store'
import type { DraftHistoryEntry } from '@shared/types'
import { hasRelevantDraftPicks } from '@shared/draftSelection'

interface HistoryData {
  entries: DraftHistoryEntry[]
}

const store = new Store<HistoryData>({
  name: 'draftapp-history',
  defaults: { entries: [] }
})

const MAX_ENTRIES = 50

export function getHistory(): DraftHistoryEntry[] {
  return store.get('entries', [])
}

export function saveDraftToHistory(entry: DraftHistoryEntry): void {
  if (!hasRelevantDraftPicks(entry.draft)) return

  const entries = getHistory()
  // Evitar duplicados si por alguna razón se llama dos veces para el mismo draft
  if (entries.some(e => e.id === entry.id)) return

  const newEntries = [entry, ...entries].slice(0, MAX_ENTRIES)
  store.set('entries', newEntries)
}

export function deleteHistoryEntry(id: string): void {
  const entries = getHistory()
  store.set('entries', entries.filter(e => e.id !== id))
}

export function clearHistory(): void {
  store.set('entries', [])
}
