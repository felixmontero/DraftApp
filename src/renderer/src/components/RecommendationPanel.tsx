import React, { useState, useCallback } from 'react'
import ChampionCard from './ChampionCard'
import BuildPanel from './BuildPanel'
import type { DraftState, Recommendation, Build, FocusedChampion } from '@shared/types'
import type { Role } from '@shared/constants'
import { ddPatchToDisplay, IPC } from '@shared/constants'

interface Props {
  draft: DraftState | null
  patch: string
  recommendations: Recommendation[]
  loading: boolean
  compact?: boolean
  focusedChampion?: FocusedChampion | null
}

export default function RecommendationPanel({ draft, patch, recommendations, loading, compact = false, focusedChampion = null }: Props): React.JSX.Element {
  const localPlayer  = draft?.myTeam.find(p => p.cellId === draft.localPlayerCellId)
  const roleLabel    = localPlayer?.assignedPosition?.toUpperCase() ?? null
  const role         = localPlayer?.assignedPosition as Role | undefined
  const patchDisplay = ddPatchToDisplay(patch)
  const currentAction = draft?.actions.find(action => action.isInProgress)
  const recommendationIntent = currentAction?.isAllyAction
    ? currentAction.type
    : undefined
  const contextLabel = recommendationIntent === 'ban'
    ? 'Mejores bans'
    : recommendationIntent === 'pick'
      ? 'Mejores picks para tu equipo'
      : currentAction
        ? 'Turno rival'
        : 'Recomendaciones'

  const [selectedKey,  setSelectedKey]  = useState<string | null>(null)
  const [selectedName, setSelectedName] = useState<string>('')
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null)
  const [selectedBuild, setSelectedBuild] = useState<Build | null>(null)
  const [buildLoading, setBuildLoading] = useState(false)

  // Refs para evitar closures obsoletas en handleSelect
  const selectedKeyRef = React.useRef<string | null>(null)
  const roleRef = React.useRef<Role | undefined>(undefined)
  const intentRef = React.useRef<typeof recommendationIntent>(undefined)
  const buildRequestRef = React.useRef(0)
  selectedKeyRef.current = selectedKey
  roleRef.current = role
  intentRef.current = recommendationIntent

  const loadBuild = useCallback(async (key: string, targetRole: Role): Promise<void> => {
    const requestId = buildRequestRef.current + 1
    buildRequestRef.current = requestId
    setBuildLoading(true)
    try {
      const build = await window.api.invoke(IPC.GET_BUILD, { champKey: key, role: targetRole }) as Build | null
      if (buildRequestRef.current === requestId && selectedKeyRef.current === key) setSelectedBuild(build)
    } finally {
      if (buildRequestRef.current === requestId && selectedKeyRef.current === key) setBuildLoading(false)
    }
  }, [])

  // Resetear seleccion solo cuando comienza un champion select nuevo.
  // No resetear cuando draft pasa a null: el poller puede enviar null momentaneamente.
  const prevDraftRef = React.useRef<DraftState | null>(null)
  React.useEffect(() => {
    if (draft !== null && prevDraftRef.current === null) {
      buildRequestRef.current += 1
      selectedKeyRef.current = null
      setSelectedKey(null)
      setSelectedRecommendation(null)
      setSelectedBuild(null)
      setBuildLoading(false)
    }
    prevDraftRef.current = draft
  }, [draft])

  React.useEffect(() => {
    if (!focusedChampion) return
    selectedKeyRef.current = focusedChampion.key
    setSelectedKey(focusedChampion.key)
    setSelectedName(focusedChampion.name)
    setSelectedRecommendation(null)
    setSelectedBuild(null)
    void loadBuild(focusedChampion.key, focusedChampion.role)
  }, [focusedChampion, loadBuild])

  const handleSelect = useCallback(async (rec: Recommendation) => {
    const { key, name } = rec.champion
    // Usar refs para evitar closures obsoletas. Esto evita que el callback
    // se recree en cada render, lo que causa re-renders innecesarios en los hijos
    if (selectedKeyRef.current === key) {
      buildRequestRef.current += 1
      selectedKeyRef.current = null
      setSelectedKey(null)
      setSelectedRecommendation(null)
      setSelectedBuild(null)
      setBuildLoading(false)
      return
    }
    if (!roleRef.current) return
    selectedKeyRef.current = key
    setSelectedKey(key)
    setSelectedName(name)
    setSelectedRecommendation(rec)
    setSelectedBuild(null)
    if (intentRef.current === 'ban') return
    void loadBuild(key, roleRef.current)
  }, [loadBuild])  // Sin dependencias de estado; usa refs

  const inDraft = draft !== null
  const visibleRecommendations = compact ? recommendations.slice(0, 3) : recommendations
  const selectedStillVisible = selectedKey
    ? visibleRecommendations.some(rec => rec.champion.key === selectedKey)
    : false
  const showPinnedSelection = Boolean(
    selectedKey && !selectedStillVisible && (buildLoading || selectedBuild)
  )

  const renderBuildState = (): React.JSX.Element => (
    buildLoading
      ? (
        <div className="app-card flex items-center gap-2 px-3 py-2 text-lol-text-dim text-xs">
          <div className="w-3.5 h-3.5 border border-lol-text-dim/40 border-t-lol-text-dim rounded-full animate-spin" />
          Cargando build...
        </div>
      )
      : selectedBuild
        ? <BuildPanel build={selectedBuild} championName={selectedName} compact={compact} />
        : (
          <p className="app-card text-lol-text-dim text-xs px-3 py-2">
            Build no disponible para este campeon/rol
          </p>
        )
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="app-header flex items-center justify-between gap-3 shrink-0">
        <span className="text-xs font-bold uppercase text-lol-text">{contextLabel}</span>
        <span className="text-lol-text-dim text-[10px] truncate uppercase">
          {roleLabel ? `${roleLabel} · ` : ''}{compact ? 'Compacto' : `Parche ${patchDisplay}`}
        </span>
      </div>

      {/* Body */}
      {!inDraft ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <div className="w-10 h-10 rounded-full border border-lol-border bg-lol-dark/40 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-lol-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-lol-text text-sm font-semibold">Esperando champion select</p>
          <p className="text-lol-text-dim text-xs mt-1">Inicia una partida para ver recomendaciones</p>
        </div>

      ) : loading && recommendations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <div className="w-7 h-7 border border-lol-text-dim/30 border-t-lol-text-dim rounded-full animate-spin mb-3" />
          <p className="text-lol-text text-sm font-semibold">Calculando recomendaciones...</p>
          <p className="text-lol-text-dim text-xs mt-1">Obteniendo datos de Lolalytics</p>
        </div>

      ) : recommendations.length > 0 || showPinnedSelection ? (
        <div className="flex flex-col overflow-y-auto p-2 gap-1.5">
          {/* Column headers */}
          <div className="grid grid-cols-[32px_40px_minmax(0,1fr)_auto] items-center gap-2 px-2.5 pb-1">
            <span className="text-[9px] uppercase text-lol-text-dim font-semibold">#</span>
            <span />
            <span className="text-[9px] uppercase text-lol-text-dim font-semibold">Campeon</span>
            <div className="grid min-w-[74px] grid-cols-2 gap-2 text-right">
              <span className="text-[9px] uppercase text-lol-text-dim font-semibold">WR</span>
              <span className="text-[9px] uppercase text-lol-text-dim font-semibold">Score</span>
            </div>
          </div>

          {showPinnedSelection && selectedRecommendation && (
            <div className="mb-1 app-card border-l-2 border-l-lol-border-bright p-1.5">
              <div className="px-1.5 pb-1 text-[10px] font-bold uppercase text-lol-text-dim">
                Seleccion fijada
              </div>
              <ChampionCard
                rec={selectedRecommendation}
                rank={0}
                intent="pick"
                selected
                onClick={() => handleSelect(selectedRecommendation)}
              />
              {renderBuildState()}
            </div>
          )}

          {showPinnedSelection && !selectedRecommendation && (
            <div className="mb-1 app-card border-l-2 border-l-lol-border-bright p-1.5">
              <div className="px-1.5 pb-1 text-[10px] font-bold uppercase text-lol-text-dim">
                Tu seleccion
              </div>
              <div className="app-card flex items-center gap-2 px-2 py-1.5 border-l-2 border-l-lol-border-bright">
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-lol-border-bright bg-lol-dark">
                  <img src={`ddragon://${selectedKey}.png`} alt={selectedName} className="h-full w-full object-cover" />
                </div>
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white">{selectedName}</span>
                <span className="shrink-0 text-[10px] font-bold uppercase text-lol-text-dim">Build</span>
              </div>
              {renderBuildState()}
            </div>
          )}

          {visibleRecommendations.map((rec, i) => (
            <React.Fragment key={rec.champion.id}>
              <ChampionCard
                rec={rec}
                rank={i + 1}
                intent={recommendationIntent}
                selected={selectedKey === rec.champion.key}
                onClick={() => handleSelect(rec)}
              />
              {selectedKey === rec.champion.key && (
                renderBuildState()
              )}
            </React.Fragment>
          ))}
        </div>

      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <p className="text-lol-text text-sm font-semibold">Sin recomendaciones disponibles</p>
          <p className="text-lol-text-dim text-xs mt-1">
            {roleLabel ? 'Datos no disponibles para este rol' : 'Esperando asignacion de rol...'}
          </p>
        </div>
      )}

    </div>
  )
}
