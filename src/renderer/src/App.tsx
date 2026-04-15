import React, { useEffect, useState } from 'react'
import StatusBar from './components/StatusBar'
import DraftBoard from './components/DraftBoard'
import RecommendationPanel from './components/RecommendationPanel'
import { IPC, CURRENT_PATCH } from '@shared/constants'
import type { ConnectionStatus, DraftState, Recommendation } from '@shared/types'

export default function App(): React.JSX.Element {
  const [connection, setConnection]     = useState<ConnectionStatus>('disconnected')
  const [draft, setDraft]               = useState<DraftState | null>(null)
  const [patch, setPatch]               = useState<string>(CURRENT_PATCH)
  const [championMap, setChampionMap]   = useState<Record<number, string>>({})
  const [recommendations, setRecs]      = useState<Recommendation[]>([])
  const [recsLoading, setRecsLoading]   = useState(false)

  useEffect(() => {
    window.api.invoke('lcu:getStatus').then((status: unknown) => {
      if (status === 'connected') setConnection('connected')
    })

    window.api.on(IPC.LCU_CONNECTED, () => setConnection('connected'))

    window.api.on(IPC.LCU_DISCONNECTED, () => {
      setConnection('disconnected')
      setDraft(null)
      setRecs([])
      setRecsLoading(false)
    })

    window.api.on(IPC.DRAFT_UPDATE, (state: unknown) => {
      if (state) {
        setDraft(state as DraftState)
        setConnection('in_draft')
        setRecsLoading(true)   // el main process empezará a calcular
      } else {
        setDraft(null)
        setConnection('connected')
        setRecs([])
        setRecsLoading(false)
      }
    })

    window.api.on(IPC.RECOMMENDATIONS_UPDATE, (recs: unknown) => {
      setRecs(recs as Recommendation[])
      setRecsLoading(false)
    })

    window.api.on(IPC.PATCH_UPDATE, (p: unknown) => {
      setPatch(p as string)
    })

    window.api.on(IPC.CHAMPIONS_UPDATE, (map: unknown) => {
      setChampionMap(map as Record<number, string>)
    })

    window.api.invoke('champions:get').then((map: unknown) => {
      const m = map as Record<number, string>
      if (Object.keys(m).length > 0) setChampionMap(m)
    })
  }, [])

  return (
    <div className="flex flex-col h-screen panel-gradient border border-lol-border rounded-lg overflow-hidden select-none shadow-2xl">

      {/* Barra de título */}
      <div
        className="h-9 bg-lol-dark flex items-center justify-between px-3 shrink-0 cursor-move border-b border-lol-border"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-lol-gold/20 border border-lol-gold/50 flex items-center justify-center">
            <div className="w-2 h-2 rounded-sm bg-lol-gold" />
          </div>
          <span className="text-lol-gold-light text-xs font-bold tracking-widest uppercase">
            DraftApp
          </span>
        </div>

        <div
          className="flex items-center gap-1"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={() => window.api.invoke('window:minimize')}
            className="w-6 h-6 rounded flex items-center justify-center text-lol-text-dim hover:text-white hover:bg-lol-surface2 transition-colors"
            title="Minimizar"
          >
            <svg width="10" height="2" viewBox="0 0 10 2" fill="currentColor">
              <rect width="10" height="2" rx="1" />
            </svg>
          </button>
          <button
            onClick={() => window.api.invoke('window:close')}
            className="w-6 h-6 rounded flex items-center justify-center text-lol-text-dim hover:text-white hover:bg-red-700 transition-colors"
            title="Cerrar"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M1 1l8 8M9 1l-8 8" />
            </svg>
          </button>
        </div>
      </div>

      {/* Línea decorativa dorada */}
      <div className="gold-line shrink-0" />

      {/* Status */}
      <StatusBar connection={connection} />

      {/* Contenido */}
      <div className="flex flex-row flex-1 overflow-hidden p-3 gap-3">
        <DraftBoard draft={draft} patch={patch} championMap={championMap} />
        <RecommendationPanel
          draft={draft}
          patch={patch}
          recommendations={recommendations}
          loading={recsLoading}
        />
      </div>

    </div>
  )
}
