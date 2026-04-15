import React from 'react'
import type { Recommendation } from '@shared/types'
import type { Tier } from '@shared/types'

interface Props {
  rec: Recommendation
  rank: number
  selected?: boolean
  onClick?: () => void
}

const RANK_STYLE: Record<number, string> = {
  1: 'text-lol-gold-light font-bold',
  2: 'text-lol-text font-semibold',
  3: 'text-lol-text font-semibold',
}

const TIER_STYLE: Record<Tier, string> = {
  S: 'bg-lol-gold/20 text-lol-gold-light border-lol-gold/50',
  A: 'bg-blue-900/30 text-blue-300 border-blue-600/50',
  B: 'bg-teal-900/30 text-teal-300 border-teal-600/50',
  C: 'bg-lol-surface2 text-lol-text border-lol-border',
  D: 'bg-red-900/20 text-red-400 border-red-700/40',
}

function barColor(score: number): string {
  if (score >= 85) return 'bg-lol-gold'
  if (score >= 70) return 'bg-lol-blue'
  return 'bg-lol-border-bright'
}

export default function ChampionCard({ rec, rank, selected, onClick }: Props): React.JSX.Element {
  const score = Math.round(rec.score)
  const tier  = rec.breakdown.tierBonus >= 0.9 ? 'S'
              : rec.breakdown.tierBonus >= 0.7 ? 'A'
              : rec.breakdown.tierBonus >= 0.5 ? 'B'
              : rec.breakdown.tierBonus >= 0.3 ? 'C' : 'D'
  const wr = (rec.breakdown.winRate * 100).toFixed(1)

  return (
    <button
      className={`
        w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left
        border transition-all
        ${selected
          ? 'border-lol-gold/60 bg-lol-gold/8 shadow-gold'
          : 'border-lol-border bg-lol-surface2 hover:border-lol-border-bright hover:bg-lol-surface2/80'
        }
      `}
      onClick={onClick}
    >
      {/* Rank */}
      <span className={`text-xs w-4 text-center shrink-0 ${RANK_STYLE[rank] ?? 'text-lol-text-dim'}`}>
        {rank}
      </span>

      {/* Icon */}
      <div className={`
        w-11 h-11 rounded border shrink-0 overflow-hidden bg-lol-dark transition-colors
        ${selected ? 'border-lol-gold/60' : 'border-lol-border'}
      `}>
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
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-white text-xs font-semibold truncate">{rec.champion.name}</span>
          <div className="flex items-center gap-1 ml-1 shrink-0">
            {/* Tier badge */}
            <span className={`text-[10px] font-bold px-1 rounded border leading-4 ${TIER_STYLE[tier as Tier]}`}>
              {tier}
            </span>
            {/* Score */}
            <span className={`text-xs font-bold ${score >= 85 ? 'text-lol-gold-light' : 'text-lol-text'}`}>
              {score}<span className="text-lol-text-dim font-normal text-[10px]">pts</span>
            </span>
          </div>
        </div>

        {/* Score bar */}
        <div className="h-1 bg-lol-dark rounded-full overflow-hidden mb-0.5">
          <div className={`h-full rounded-full transition-all ${barColor(score)}`} style={{ width: `${score}%` }} />
        </div>

        {/* Win rate + reason */}
        <div className="flex items-center justify-between">
          <p className="text-lol-text-dim text-xs truncate flex-1">
            {rec.reasons[0] ?? 'Pick consistente'}
          </p>
          <span className="text-lol-text-dim text-[10px] ml-1 shrink-0">{wr}% WR</span>
        </div>
      </div>

      {/* Expand indicator */}
      <svg
        className={`w-3 h-3 shrink-0 transition-transform ${selected ? 'rotate-90 text-lol-gold' : 'text-lol-text-dim'}`}
        fill="none" viewBox="0 0 6 10" stroke="currentColor" strokeWidth={1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M1 1l4 4-4 4" />
      </svg>
    </button>
  )
}
