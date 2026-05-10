import React, { useEffect, useState } from 'react'
import StatusBar from './components/StatusBar'
import DraftBoard from './components/DraftBoard'
import RecommendationPanel from './components/RecommendationPanel'
import SettingsPanel from './components/SettingsPanel'
import { CURRENT_PATCH, IPC } from '@shared/constants'
import type { ConnectionStatus, DraftState, FocusedChampion, Recommendation, UserSettings } from '@shared/types'

export default function App(): React.JSX.Element {
  const [connection, setConnection] = useState<ConnectionStatus>('disconnected')
  const [draft, setDraft] = useState<DraftState | null>(null)
  const [patch, setPatch] = useState<string>(CURRENT_PATCH)
  const [championMap, setChampionMap] = useState<Record<number, string>>({})
  const [recommendations, setRecs] = useState<Recommendation[]>([])
  const [recsLoading, setRecsLoading] = useState(false)
  const [compactMode, setCompactMode] = useState(false)
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [focusedChampion, setFocusedChampion] = useState<FocusedChampion | null>(null)

  useEffect(() => {
    let active = true

    window.api.invoke('lcu:getStatus').then((status: unknown) => {
      if (active && status === 'connected') setConnection('connected')
    })

    window.api.invoke(IPC.APP_GET_SETTINGS).then((settings: unknown) => {
      if (!active) return
      const userSettings = settings as UserSettings
      setSettings(userSettings)
      setCompactMode(Boolean(userSettings.overlay?.compactMode))
    })

    const unsubscribers = [
      window.api.on(IPC.LCU_CONNECTED, () => setConnection('connected')),

      window.api.on(IPC.LCU_DISCONNECTED, () => {
        setConnection('disconnected')
        setDraft(null)
        setFocusedChampion(null)
        setRecs([])
        setRecsLoading(false)
      }),

      window.api.on(IPC.DRAFT_UPDATE, (state: unknown) => {
        if (state) {
          setDraft(state as DraftState)
          setConnection('in_draft')
          setRecs(prevRecs => {
            if (prevRecs.length === 0) setRecsLoading(true)
            return prevRecs
          })
        } else {
          setDraft(null)
          setFocusedChampion(null)
          setConnection('connected')
          setRecs([])
          setRecsLoading(false)
        }
      }),

      window.api.on(IPC.RECOMMENDATIONS_UPDATE, (recs: unknown) => {
        setRecs(recs as Recommendation[])
        setRecsLoading(false)
      }),

      window.api.on(IPC.PATCH_UPDATE, (p: unknown) => {
        setPatch(p as string)
      }),

      window.api.on(IPC.CHAMPIONS_UPDATE, (map: unknown) => {
        setChampionMap(map as Record<number, string>)
      })
    ]

    window.api.invoke('champions:get').then((map: unknown) => {
      if (!active) return
      const m = map as Record<number, string>
      if (Object.keys(m).length > 0) setChampionMap(m)
    })

    return () => {
      active = false
      unsubscribers.forEach(unsubscribe => unsubscribe())
    }
  }, [])

  const updateOverlaySettings = async (partial: Partial<UserSettings['overlay']>): Promise<void> => {
    const updated = await window.api.invoke(IPC.APP_SET_OVERLAY_SETTINGS, partial) as UserSettings
    setSettings(updated)
    setCompactMode(Boolean(updated.overlay.compactMode))
  }

  const toggleCompactMode = (): void => {
    void updateOverlaySettings({ compactMode: !compactMode })
  }

  const toggleAlwaysOnTop = (): void => {
    void updateOverlaySettings({ alwaysOnTop: !(settings?.overlay.alwaysOnTop ?? true) })
  }

  const resetWindowBounds = async (): Promise<void> => {
    const updated = await window.api.invoke(IPC.WINDOW_RESET_BOUNDS) as UserSettings
    setSettings(updated)
  }

  return (
    <div className="relative flex flex-col h-screen panel-gradient border border-lol-border rounded-lg overflow-hidden select-none shadow-2xl">

      {/* Barra de titulo */}
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
            onClick={toggleCompactMode}
            className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
              compactMode
                ? 'text-lol-gold-light bg-lol-gold/10'
                : 'text-lol-text-dim hover:text-white hover:bg-lol-surface2'
            }`}
            title={compactMode ? 'Vista completa' : 'Vista compacta'}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d={compactMode ? 'M4.5 1H1v3.5M7.5 1H11v3.5M4.5 11H1V7.5M7.5 11H11V7.5' : 'M1 4.5V1h3.5M11 4.5V1H7.5M1 7.5V11h3.5M11 7.5V11H7.5'} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={() => setSettingsOpen(value => !value)}
            className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
              settingsOpen
                ? 'text-lol-gold-light bg-lol-gold/10'
                : 'text-lol-text-dim hover:text-white hover:bg-lol-surface2'
            }`}
            title="Ajustes"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.8 1.5h2.4l.4 1.8a5.3 5.3 0 0 1 1.2.7l1.8-.6 1.2 2.1-1.4 1.2a5 5 0 0 1 0 1.4l1.4 1.2-1.2 2.1-1.8-.6a5.3 5.3 0 0 1-1.2.7l-.4 1.8H6.8l-.4-1.8a5.3 5.3 0 0 1-1.2-.7l-1.8.6-1.2-2.1 1.4-1.2a5 5 0 0 1 0-1.4L2.2 5.5l1.2-2.1 1.8.6a5.3 5.3 0 0 1 1.2-.7l.4-1.8Z" />
              <path d="M8 5.8a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4Z" />
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

      <div className="gold-line shrink-0" />

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          compactMode={compactMode}
          onToggleCompact={toggleCompactMode}
          onToggleAlwaysOnTop={toggleAlwaysOnTop}
          onResetBounds={() => { void resetWindowBounds() }}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      <StatusBar connection={connection} draft={draft} />

      <div className={`flex flex-row flex-1 overflow-hidden ${compactMode ? 'p-2 gap-2' : 'p-3 gap-3'}`}>
        {!compactMode && (
          <DraftBoard
            draft={draft}
            patch={patch}
            championMap={championMap}
            onFocusChampion={setFocusedChampion}
          />
        )}
        <RecommendationPanel
          draft={draft}
          patch={patch}
          recommendations={recommendations}
          loading={recsLoading}
          compact={compactMode}
          focusedChampion={focusedChampion}
        />
      </div>

    </div>
  )
}
