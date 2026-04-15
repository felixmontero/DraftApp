import React from 'react'
import ChampionCard from './ChampionCard'
import type { DraftState, Recommendation } from '@shared/types'
import { ddPatchToDisplay } from '@shared/constants'

interface Props {
  draft: DraftState | null
  patch: string
  recommendations: Recommendation[]
  loading: boolean
}

export default function RecommendationPanel({ draft, patch, recommendations, loading }: Props): React.JSX.Element {
  const localPlayer  = draft?.myTeam.find(p => p.cellId === draft.localPlayerCellId)
  const roleLabel    = localPlayer?.assignedPosition?.toUpperCase() ?? null
  const patchDisplay = ddPatchToDisplay(patch)

  // Estado de la interfaz según la situación
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

      {/* Cuerpo */}
      {!inDraft ? (
        /* Sin draft activo */
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
        /* Calculando — primera carga */
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <div className="w-8 h-8 border-2 border-lol-gold/30 border-t-lol-gold rounded-full animate-spin mb-3" />
          <p className="text-lol-text text-sm font-medium">Calculando recomendaciones…</p>
          <p className="text-lol-text-dim text-xs mt-1">Obteniendo datos de Lolalytics</p>
        </div>

      ) : recommendations.length > 0 ? (
        /* Resultados */
        <div className="flex flex-col gap-1 overflow-y-auto p-2">
          {recommendations.map((rec, i) => (
            <ChampionCard key={rec.champion.id} rec={rec} rank={i + 1} />
          ))}
        </div>

      ) : (
        /* Draft activo pero sin recomendaciones (rol sin asignar, etc.) */
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
