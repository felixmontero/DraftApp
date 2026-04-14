import React from 'react'
import ChampionCard from './ChampionCard'
import type { DraftState, Recommendation } from '@shared/types'
import { ddPatchToDisplay } from '@shared/constants'

interface Props {
  draft: DraftState | null
  patch: string
}

// Fase 4: mock data para visualizar el diseño mientras el engine no está listo
function buildMockRecommendations(patch: string): Recommendation[] {
  const base = `https://ddragon.leagueoflegends.com/cdn/${patch}/img/champion`
  return [
    {
      champion: { id: 266, key: 'Aatrox', name: 'Aatrox', iconUrl: `${base}/Aatrox.png` },
      score: 94,
      breakdown: { winRate: 0.54, counterScore: 0.82, synergyScore: 0.78, tierBonus: 1.0 },
      reasons: ['Counter vs Darius', 'Sinergia con Jinx', `S-Tier parche ${ddPatchToDisplay(patch)}`]
    },
    {
      champion: { id: 84, key: 'Akali', name: 'Akali', iconUrl: `${base}/Akali.png` },
      score: 87,
      breakdown: { winRate: 0.52, counterScore: 0.74, synergyScore: 0.65, tierBonus: 0.8 },
      reasons: ['Counter vs Malphite', `A-Tier parche ${ddPatchToDisplay(patch)}`]
    },
    {
      champion: { id: 103, key: 'Ahri', name: 'Ahri', iconUrl: `${base}/Ahri.png` },
      score: 82,
      breakdown: { winRate: 0.51, counterScore: 0.70, synergyScore: 0.60, tierBonus: 0.7 },
      reasons: ['Win rate estable 51.2%']
    },
    {
      champion: { id: 164, key: 'Camille', name: 'Camille', iconUrl: `${base}/Camille.png` },
      score: 76,
      breakdown: { winRate: 0.50, counterScore: 0.62, synergyScore: 0.55, tierBonus: 0.6 },
      reasons: ['Sinergia con Orianna']
    },
    {
      champion: { id: 39, key: 'Irelia', name: 'Irelia', iconUrl: `${base}/Irelia.png` },
      score: 71,
      breakdown: { winRate: 0.49, counterScore: 0.58, synergyScore: 0.52, tierBonus: 0.5 },
      reasons: ['B-Tier — pick seguro']
    }
  ]
}

export default function RecommendationPanel({ draft, patch }: Props): React.JSX.Element {
  const recommendations = draft ? buildMockRecommendations(patch) : []

  const localPlayer = draft?.myTeam.find(p => p.cellId === draft.localPlayerCellId)
  const roleLabel = localPlayer?.assignedPosition
    ? localPlayer.assignedPosition.toUpperCase()
    : null

  // Convertir versión DD a display del juego (ej: "16.7.1" → "26.7")
  const patchDisplay = ddPatchToDisplay(patch)

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-lol-surface border border-lol-border rounded-md">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-lol-dark/60 border-b border-lol-border shrink-0">
        <span className="text-lol-gold text-xs font-bold uppercase tracking-wider">Recomendaciones</span>
        <span className="text-lol-text-dim text-xs">
          {roleLabel ? `${roleLabel} · ` : ''}Parche {patchDisplay}
        </span>
      </div>

      {recommendations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <div className="w-10 h-10 rounded-full border border-lol-border flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-lol-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-lol-text text-sm font-medium">Esperando champion select</p>
          <p className="text-lol-text-dim text-xs mt-1">Inicia una partida para ver recomendaciones</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1 overflow-y-auto p-2">
          {recommendations.map((rec, i) => (
            <ChampionCard key={rec.champion.id} rec={rec} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
