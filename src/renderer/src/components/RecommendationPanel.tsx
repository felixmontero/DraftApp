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
  const [selectedSource, setSelectedSource] = useState<FocusedChampion['source'] | null>(null)
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null)
  const [selectedBuild, setSelectedBuild] = useState<Build | null>(null)
  const [selectionNotice, setSelectionNotice] = useState<string | null>(null)
  const [buildLoading, setBuildLoading] = useState(false)
  const [buildSettled, setBuildSettled] = useState(false)

  // Refs para evitar closures obsoletas en handleSelect
  const selectedKeyRef = React.useRef<string | null>(null)
  const selectedSourceRef = React.useRef<FocusedChampion['source'] | null>(null)
  const roleRef = React.useRef<Role | undefined>(undefined)
  const intentRef = React.useRef<typeof recommendationIntent>(undefined)
  const buildRequestRef = React.useRef(0)
  const focusedFingerprintRef = React.useRef<string | null>(null)
  selectedKeyRef.current = selectedKey
  selectedSourceRef.current = selectedSource
  roleRef.current = role
  intentRef.current = recommendationIntent

  const loadBuild = useCallback(async (key: string, targetRole: Role): Promise<void> => {
    const requestId = buildRequestRef.current + 1
    buildRequestRef.current = requestId
    setBuildLoading(true)
    setBuildSettled(false)
    try {
      const build = await window.api.invoke(IPC.GET_BUILD, { champKey: key, role: targetRole }) as Build | null
      if (buildRequestRef.current === requestId && selectedKeyRef.current === key) setSelectedBuild(build)
    } finally {
      if (buildRequestRef.current === requestId && selectedKeyRef.current === key) {
        setBuildLoading(false)
        setBuildSettled(true)
      }
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
      setSelectedSource(null)
      setSelectedRecommendation(null)
      setSelectedBuild(null)
      setSelectionNotice(null)
      setBuildLoading(false)
      setBuildSettled(false)
      focusedFingerprintRef.current = null
    }
    prevDraftRef.current = draft
  }, [draft])

  React.useEffect(() => {
    if (!focusedChampion) {
      if (selectedSourceRef.current === 'auto') {
        buildRequestRef.current += 1
        selectedKeyRef.current = null
        selectedSourceRef.current = null
        setSelectedKey(null)
        setSelectedSource(null)
        setSelectedRecommendation(null)
        setSelectedBuild(null)
        setSelectionNotice(null)
        setBuildLoading(false)
        setBuildSettled(false)
        focusedFingerprintRef.current = null
      }
      return
    }
    const focusedFingerprint = `${focusedChampion.key}:${focusedChampion.role}:${focusedChampion.source ?? 'manual'}`
    if (focusedFingerprintRef.current === focusedFingerprint) return
    focusedFingerprintRef.current = focusedFingerprint
    selectedKeyRef.current = focusedChampion.key
    setSelectedKey(focusedChampion.key)
    setSelectedName(focusedChampion.name)
    setSelectedSource(focusedChampion.source ?? 'manual')
    setSelectedRecommendation(null)
    setSelectedBuild(null)
    setSelectionNotice(null)
    setBuildSettled(false)
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
      setSelectedSource(null)
      setSelectedRecommendation(null)
      setSelectedBuild(null)
      setSelectionNotice(null)
      setBuildLoading(false)
      setBuildSettled(false)
      focusedFingerprintRef.current = null
      return
    }
    if (!roleRef.current) {
      setSelectionNotice('Asigna un rol para ver la build')
      return
    }
    selectedKeyRef.current = key
    setSelectedKey(key)
    setSelectedName(name)
    setSelectedSource('manual')
    setSelectedRecommendation(rec)
    setSelectedBuild(null)
    setSelectionNotice(null)
    setBuildSettled(false)
    focusedFingerprintRef.current = null
    if (intentRef.current === 'ban') {
      setSelectionNotice('Los bans no tienen build asociada')
      setBuildSettled(true)
      return
    }
    void loadBuild(key, roleRef.current)
  }, [loadBuild])  // Sin dependencias de estado; usa refs

  const inDraft = draft !== null
  const selectedIsAutoPick = selectedSource === 'auto'
  const baseRecommendations = selectedIsAutoPick && selectedKey
    ? recommendations.filter(rec => rec.champion.key !== selectedKey)
    : recommendations
  const visibleRecommendations = compact ? baseRecommendations.slice(0, 3) : baseRecommendations
  const selectedStillVisible = selectedKey && !selectedIsAutoPick
    ? visibleRecommendations.some(rec => rec.champion.key === selectedKey)
    : false
  const hasBuildState = buildLoading || buildSettled || Boolean(selectedBuild)
  const showAutoPick = Boolean(selectedIsAutoPick && selectedKey && hasBuildState)
  const showPinnedSelection = Boolean(
    !showAutoPick && selectedKey && !selectedStillVisible && hasBuildState
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

      ) : recommendations.length > 0 || showPinnedSelection || showAutoPick ? (
        <div className="flex flex-col overflow-y-auto p-2 gap-1.5">
          {selectionNotice && (
            <div className="app-card px-3 py-2 text-xs font-semibold text-lol-text-dim">
              {selectionNotice}
            </div>
          )}

          {showAutoPick && (
            <div className="mb-1 app-card border-l-2 border-l-lol-green/70 p-1.5">
              <div className="px-1.5 pb-1 text-[10px] font-bold uppercase text-lol-green">
                Tu pick
              </div>
              <div className="app-card flex items-center gap-2 px-2 py-1.5 border-l-2 border-l-lol-green/70">
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-lol-green/45 bg-lol-dark">
                  <img src={`ddragon://${selectedKey}.png`} alt={selectedName} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-white">{selectedName}</span>
                  <span className="block truncate text-[10px] text-lol-text-dim">
                    {roleLabel ? `${roleLabel} - ` : ''}Build fijada automáticamente
                  </span>
                </div>
                <span className="shrink-0 text-[10px] font-bold uppercase text-lol-green">Build</span>
              </div>
              {renderBuildState()}
            </div>
          )}

          {/* Column headers */}
          {visibleRecommendations.length > 0 && (
          <div className="grid grid-cols-[32px_40px_minmax(0,1fr)_auto] items-center gap-2 px-2.5 pb-1">
            <span className="text-[9px] uppercase text-lol-text-dim font-semibold">#</span>
            <span />
            <span className="text-[9px] uppercase text-lol-text-dim font-semibold">Campeón</span>
            <div className="grid min-w-[74px] grid-cols-2 gap-2 text-right">
              <span className="text-[9px] uppercase text-lol-text-dim font-semibold">WR</span>
              <span className="text-[9px] uppercase text-lol-text-dim font-semibold">Score</span>
            </div>
          </div>
          )}

          {showPinnedSelection && selectedRecommendation && (
            <div className="mb-1 app-card border-l-2 border-l-lol-border-bright p-1.5">
              <div className="px-1.5 pb-1 text-[10px] font-bold uppercase text-lol-text-dim">
                Selección fijada
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
            {roleLabel ? 'Datos no disponibles para este rol' : 'Esperando asignación de rol...'}
          </p>
        </div>
      )}

    </div>
  )
}
