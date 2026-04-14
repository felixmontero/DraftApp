import React from 'react'
import type { Recommendation } from '@shared/types'

interface Props {
  rec: Recommendation
  rank: number
}

// Color del badge según posición
const rankStyle: Record<number, string> = {
  1: 'text-lol-gold-light font-bold',
  2: 'text-lol-text font-semibold',
  3: 'text-lol-text font-semibold',
}

// Color de la barra según score
function barColor(score: number): string {
  if (score >= 90) return 'bg-lol-gold'
  if (score >= 75) return 'bg-lol-blue'
  return 'bg-lol-border-bright'
}

export default function ChampionCard({ rec, rank }: Props): React.JSX.Element {
  const scorePercent = Math.round(rec.score)

  return (
    <div className="
      flex items-center gap-2 px-2 py-1.5 rounded-md
      bg-lol-surface2 border border-lol-border
      hover:border-lol-border-bright hover:bg-lol-surface2/80
      transition-all cursor-pointer group
    ">
      {/* Rank */}
      <span className={`text-xs w-4 text-center shrink-0 ${rankStyle[rank] ?? 'text-lol-text-dim'}`}>
        {rank}
      </span>

      {/* Icono */}
      <div className="w-11 h-11 rounded border border-lol-border group-hover:border-lol-border-bright shrink-0 overflow-hidden bg-lol-dark transition-colors">
        {rec.champion.iconUrl ? (
          <img src={rec.champion.iconUrl} alt={rec.champion.name} className="w-full h-full object-cover" />
        ) : (
          <span className="flex items-center justify-center w-full h-full text-lol-text-dim text-xs">
            {rec.champion.key.slice(0, 2)}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-white text-xs font-semibold truncate">{rec.champion.name}</span>
          <span className={`text-xs font-bold ml-1 shrink-0 ${scorePercent >= 90 ? 'text-lol-gold-light' : 'text-lol-text'}`}>
            {scorePercent}
            <span className="text-lol-text-dim font-normal">pts</span>
          </span>
        </div>

        {/* Score bar */}
        <div className="h-1 bg-lol-dark rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor(scorePercent)}`}
            style={{ width: `${scorePercent}%` }}
          />
        </div>

        {/* Reason */}
        {rec.reasons.length > 0 && (
          <p className="text-lol-text-dim text-xs mt-0.5 truncate">{rec.reasons[0]}</p>
        )}
      </div>
    </div>
  )
}
