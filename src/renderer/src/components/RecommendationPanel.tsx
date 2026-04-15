import React, { useState, useCallback } from 'react'
import ChampionCard from './ChampionCard'
import BuildPanel from './BuildPanel'
import type { DraftState, Recommendation, Build } from '@shared/types'
import type { Role } from '@shared/constants'
import { ddPatchToDisplay, IPC } from '@shared/constants'

interface Props {
  draft: DraftState | null
  patch: string
  recommendations: Recommendation[]
  loading: boolean
}

export default function RecommendationPanel({ draft, patch, recommendations, loading }: Props): React.JSX.Element {
  const localPlayer  = draft?.myTeam.find(p => p.cellId === draft.localPlayerCellId)
  const roleLabel    = localPlayer?.assignedPosition?.toUpperCase() ?? null
  const role         = localPlayer?.assignedPosition as Role | undefined
  const patchDisplay = ddPatchToDisplay(patch)

  const [selectedKey,  setSelectedKey]  = useState<string | null>(null)
  const [selectedName, setSelectedName] = useState<string>('')
  const [selectedBuild, setSelectedBuild] = useState<Build | null>(null)
  const [buildLoading, setBuildLoading] = useState(false)

  // Refs para evitar closures obsoletas en handleSelect
  const selectedKeyRef = React.useRef<string | null>(null)
  const roleRef = React.useRef<Role | undefined>(undefined)
  selectedKeyRef.current = selectedKey
  roleRef.current = role

  // Resetear selección solo cuando comienza un champion select NUEVO (draft pasa de null → no-null)
  // No resetear cuando draft pasa a null — el poller puede enviar null momentáneamente
  const prevDraftRef = React.useRef<DraftState | null>(null)
  React.useEffect(() => {
    if (draft !== null && prevDraftRef.current === null) {
      setSelectedKey(null)
      setSelectedBuild(null)
    }
    prevDraftRef.current = draft
  }, [draft])

  const handleSelect = useCallback(async (key: string, name: string) => {
    // Usar refs para evitar closures obsoletas — esto evita que el callback
    // se recree en cada render, lo que causa re-renders innecesarios en los hijos
    if (selectedKeyRef.current === key) {
      setSelectedKey(null)
      setSelectedBuild(null)
      return
    }
    if (!roleRef.current) return
    setSelectedKey(key)
    setSelectedName(name)
    setSelectedBuild(null)
    setBuildLoading(true)
    try {
      const build = await window.api.invoke(IPC.GET_BUILD, { champKey: key, role: roleRef.current }) as Build | null
      setSelectedBuild(build)
    } finally {
      setBuildLoading(false)
    }
  }, [])  // Sin dependencias — usa refs

  const inDraft = draft !== null

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-lol-surface border border-lol-border rounded-md">

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-lol-dark/60 border-b border-lol-border shrink-0">
        <span className="text-lol-gold text-xs font-bold uppercase tracking-wider">Recomendaciones</span>
        <span className="text-lol-text-dim text-xs">
          {roleLabel ? `${roleLabel} · ` : ''}Parche {patchDisplay}
        </span>
      </div>

      {/* Body */}
      {!inDraft ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <div className="w-10 h-10 rounded-full border border-lol-border flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-lol-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-lol-text text-sm font-medium">Esperando champion select</p>
          <p className="text-lol-text-dim text-xs mt-1">Inicia una partida para ver recomendaciones</p>
        </div>

      ) : loading && recommendations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <div className="w-8 h-8 border-2 border-lol-gold/30 border-t-lol-gold rounded-full animate-spin mb-3" />
          <p className="text-lol-text text-sm font-medium">Calculando recomendaciones…</p>
          <p className="text-lol-text-dim text-xs mt-1">Obteniendo datos de Lolalytics</p>
        </div>

      ) : recommendations.length > 0 ? (
        <div className="flex flex-col overflow-y-auto p-2 gap-1">
          {recommendations.map((rec, i) => (
            <React.Fragment key={rec.champion.id}>
              <ChampionCard
                rec={rec}
                rank={i + 1}
                selected={selectedKey === rec.champion.key}
                onClick={() => handleSelect(rec.champion.key, rec.champion.name)}
              />
              {/* Inline build panel */}
              {selectedKey === rec.champion.key && (
                buildLoading
                  ? (
                    <div className="flex items-center gap-2 px-3 py-2 text-lol-text-dim text-xs">
                      <div className="w-4 h-4 border border-lol-gold/30 border-t-lol-gold rounded-full animate-spin" />
                      Cargando build…
                    </div>
                  )
                  : selectedBuild
                    ? <BuildPanel build={selectedBuild} championName={selectedName} />
                    : (
                      <p className="text-lol-text-dim text-xs px-3 py-1">
                        Build no disponible para este campeón/rol
                      </p>
                    )
              )}
            </React.Fragment>
          ))}
        </div>

      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <p className="text-lol-text text-sm font-medium">Sin recomendaciones disponibles</p>
          <p className="text-lol-text-dim text-xs mt-1">
            {roleLabel ? 'Datos no disponibles para este rol' : 'Esperando asignación de rol…'}
          </p>
        </div>
      )}

    </div>
  )
}
