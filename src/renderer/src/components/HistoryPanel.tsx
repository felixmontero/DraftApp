import React, { useEffect, useState } from 'react'
import type { DraftHistoryEntry } from '@shared/types'
import { IPC, ddPatchToDisplay } from '@shared/constants'
import ChampionCard from './ChampionCard'

export default function HistoryPanel(): React.JSX.Element {
  const [history, setHistory] = useState<DraftHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState<DraftHistoryEntry | null>(null)

  const loadHistory = async (): Promise<void> => {
    setLoading(true)
    try {
      const data = await window.api.invoke(IPC.HISTORY_GET) as DraftHistoryEntry[]
      setHistory(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadHistory()
  }, [])

  const handleDelete = async (id: string, e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    await window.api.invoke(IPC.HISTORY_DELETE, id)
    if (selectedEntry?.id === id) setSelectedEntry(null)
    void loadHistory()
  }

  const handleClear = async (): Promise<void> => {
    if (!confirm('¿Borrar todo el historial?')) return
    await window.api.invoke(IPC.HISTORY_CLEAR)
    setSelectedEntry(null)
    void loadHistory()
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-lol-text-dim p-4">
        <div className="w-6 h-6 border-2 border-lol-border border-t-lol-gold rounded-full animate-spin mb-2" />
        <span className="text-xs">Cargando historial...</span>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-lol-text-dim p-6 text-center">
        <svg className="w-10 h-10 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm font-semibold text-lol-text">Historial vacío</p>
        <p className="text-[11px] mt-1">Tus drafts aparecerán aquí automáticamente al finalizar.</p>
      </div>
    )
  }

  if (selectedEntry) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="app-header flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={() => setSelectedEntry(null)}
            className="text-[10px] uppercase font-bold text-lol-gold hover:text-white flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
          <span className="text-lol-text-dim text-[10px] uppercase">
            {new Date(selectedEntry.timestamp).toLocaleString()}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          <div className="app-card p-2.5">
            <div className="text-[10px] font-bold uppercase text-lol-text-dim mb-2">Resumen del draft</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-[9px] uppercase text-lol-blue font-bold">Tus aliados</div>
                {selectedEntry.draft.myTeam.map(p => (
                  <div key={p.cellId} className="flex items-center gap-1.5 text-[11px]">
                    <div className="w-4 h-4 rounded-sm bg-lol-dark border border-lol-blue/30 overflow-hidden">
                      {p.championId > 0 && <img src={`ddragon://${p.championId}.png`} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <span className="text-lol-text font-medium truncate">
                      {p.assignedPosition?.toUpperCase() || '??'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <div className="text-[9px] uppercase text-lol-red font-bold text-right">Enemigos</div>
                {selectedEntry.draft.theirTeam.map(p => (
                  <div key={p.cellId} className="flex items-center gap-1.5 text-[11px] flex-row-reverse">
                    <div className="w-4 h-4 rounded-sm bg-lol-dark border border-lol-red/30 overflow-hidden">
                      {p.championId > 0 && <img src={`ddragon://${p.championId}.png`} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <span className="text-lol-text-dim font-medium truncate">
                      {p.assignedPosition?.toUpperCase() || '??'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="px-1 text-[10px] font-bold uppercase text-lol-text-dim">Recomendaciones sugeridas</div>
            {selectedEntry.recommendations.map((rec, i) => (
              <ChampionCard
                key={rec.champion.id}
                rec={rec}
                rank={i + 1}
                intent="pick"
                selected={false}
                onClick={() => {}}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="app-header flex items-center justify-between gap-3 shrink-0">
        <span className="text-xs font-bold uppercase text-lol-text">Historial de drafts</span>
        <button
          onClick={handleClear}
          className="text-[10px] uppercase font-bold text-lol-red hover:text-white transition-colors"
        >
          Limpiar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {history.map(entry => {
          const localPlayer = entry.draft.myTeam.find(p => p.cellId === entry.draft.localPlayerCellId)
          const myChampId = localPlayer?.championId || 0

          return (
            <button
              key={entry.id}
              onClick={() => setSelectedEntry(entry)}
              className="app-card app-card-hover w-full p-2 flex items-center gap-3 text-left group"
            >
              <div className="w-8 h-8 rounded border border-lol-border overflow-hidden bg-lol-dark shrink-0">
                {myChampId > 0
                  ? <img src={`ddragon://${myChampId}.png`} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-[10px] text-lol-text-dim font-bold">?</div>
                }
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-lol-text truncate">
                    {localPlayer?.assignedPosition?.toUpperCase() || 'DRAFT'}
                  </span>
                  <span className="text-[9px] text-lol-text-dim shrink-0">
                    {new Date(entry.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-[10px] text-lol-text-dim truncate">
                  Parche {ddPatchToDisplay(entry.patch)}
                </div>
              </div>

              <div
                onClick={(e) => { void handleDelete(entry.id, e) }}
                className="w-6 h-6 rounded flex items-center justify-center text-lol-text-dim hover:text-lol-red hover:bg-lol-red/10 opacity-0 group-hover:opacity-100 transition-all"
                title="Eliminar"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
