import React, { useEffect, useRef, useState } from 'react'
import DraftBoard from './components/DraftBoard'
import RecommendationPanel from './components/RecommendationPanel'
import HistoryPanel from './components/HistoryPanel'
import SettingsPanel from './components/SettingsPanel'
import { CURRENT_PATCH, IPC, ddPatchToDisplay } from '@shared/constants'
import type { ConnectionStatus, DraftState, FocusedChampion, Recommendation, UserSettings } from '@shared/types'
import { getLocalPickFocus, shouldApplyAutoFocus, shouldClearAutoFocus } from '@shared/draftSelection'

type TabView = 'draft' | 'recommendations' | 'history'

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
  const [activeView, setActiveView] = useState<TabView>('recommendations')
  const hadDraftRef = useRef(false)
  const autoFocusedPickRef = useRef<string | null>(null)

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
        hadDraftRef.current = false
        autoFocusedPickRef.current = null
        setConnection('disconnected')
        setDraft(null)
        setFocusedChampion(null)
        setRecs([])
        setRecsLoading(false)
      }),

      window.api.on(IPC.DRAFT_UPDATE, (state: unknown) => {
        if (state) {
          if (!hadDraftRef.current) {
            setActiveView('recommendations')
          }
          hadDraftRef.current = true
          setDraft(state as DraftState)
          setConnection('in_draft')
          setRecs(prevRecs => {
            if (prevRecs.length === 0) setRecsLoading(true)
            return prevRecs
          })
        } else {
          hadDraftRef.current = false
          autoFocusedPickRef.current = null
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

  useEffect(() => {
    if (!draft) return
    if (focusedChampion?.source === 'manual') return

    const focusCandidate = getLocalPickFocus(draft, championMap)
    if (shouldClearAutoFocus(autoFocusedPickRef.current, focusCandidate)) {
      autoFocusedPickRef.current = null
      setFocusedChampion(null)
      return
    }
    if (!shouldApplyAutoFocus(autoFocusedPickRef.current, focusCandidate)) return

    autoFocusedPickRef.current = focusCandidate.fingerprint
    setFocusedChampion(focusCandidate.champion)
  }, [draft, championMap, focusedChampion?.source])

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
    setCompactMode(Boolean(updated.overlay.compactMode))
    setActiveView('recommendations')
    setSettingsOpen(false)
  }

  const patchDisplay = ddPatchToDisplay(patch)

  const connectionMeta = connection === 'in_draft'
    ? { label: 'Draft activo', color: 'bg-lol-green' }
    : connection === 'connected'
      ? { label: 'Conectado', color: 'bg-lol-blue' }
      : { label: 'Sin conexión', color: 'bg-lol-text-dim' }

  return (
    <div className="relative flex flex-col h-screen panel-gradient border border-lol-border rounded-md overflow-hidden select-none">

      {/* Title bar */}
      <div
        className="h-8 flex items-center justify-between px-3 shrink-0 cursor-move border-b border-lol-border/60"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <span className="text-[11px] font-bold tracking-wider text-white/90 uppercase">
          DraftApp
        </span>

        <div
          className="flex items-center gap-2"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <div className="hidden items-center gap-1.5 text-[10px] text-lol-text-dim sm:flex mr-1">
            <span className={`h-1.5 w-1.5 rounded-full ${connectionMeta.color}`} />
            <span>{connectionMeta.label} - Parche {patchDisplay}</span>
          </div>
          <button
            onClick={() => window.api.invoke('window:minimize')}
            className="w-6 h-6 rounded flex items-center justify-center text-lol-text-dim hover:text-white hover:bg-lol-surface2/60 transition-colors"
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
                ? 'text-white bg-lol-surface2/60'
                : 'text-lol-text-dim hover:text-white hover:bg-lol-surface2/60'
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
                ? 'text-white bg-lol-surface2/60'
                : 'text-lol-text-dim hover:text-white hover:bg-lol-surface2/60'
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
            className="w-6 h-6 rounded flex items-center justify-center text-lol-text-dim hover:text-white hover:bg-red-700/80 transition-colors"
            title="Cerrar"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M1 1l8 8M9 1l-8 8" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs - replace NavigationRail */}
      {!compactMode && (
        <div className="flex shrink-0 border-b border-lol-border/60">
          <button
            onClick={() => setActiveView('draft')}
            className={`flex-1 py-2 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
              activeView === 'draft'
                ? 'text-white border-b-2 border-lol-gold'
                : 'text-lol-text-dim hover:text-lol-text'
            }`}
          >
            Draft
          </button>
          <button
            onClick={() => setActiveView('recommendations')}
            className={`flex-1 py-2 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
              activeView === 'recommendations'
                ? 'text-white border-b-2 border-lol-gold'
                : 'text-lol-text-dim hover:text-lol-text'
            }`}
          >
            Picks
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`flex-1 py-2 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
              activeView === 'history'
                ? 'text-white border-b-2 border-lol-gold'
                : 'text-lol-text-dim hover:text-lol-text'
            }`}
          >
            Historial
          </button>
        </div>
      )}

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          compactMode={compactMode}
          onToggleCompact={toggleCompactMode}
          onToggleAlwaysOnTop={toggleAlwaysOnTop}
          onFocusRecommendations={() => {
            setActiveView('recommendations')
            setSettingsOpen(false)
          }}
          onResetBounds={() => { void resetWindowBounds() }}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {!compactMode && activeView === 'draft' && (
          <DraftBoard
            draft={draft}
            patch={patch}
            championMap={championMap}
            onFocusChampion={(champion) => {
              autoFocusedPickRef.current = null
              setFocusedChampion({ ...champion, source: 'manual' })
            }}
          />
        )}
        {!compactMode && activeView === 'history' && (
          <HistoryPanel />
        )}
        {(compactMode || activeView === 'recommendations') && (
          <RecommendationPanel
            draft={draft}
            patch={patch}
            recommendations={recommendations}
            loading={recsLoading}
            compact={compactMode}
            focusedChampion={focusedChampion}
          />
        )}
      </div>

    </div>
  )
}
