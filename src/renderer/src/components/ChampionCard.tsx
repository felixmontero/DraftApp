import React from 'react'
import type { Recommendation, Tier } from '@shared/types'

interface Props {
  rec: Recommendation
  rank: number
  intent?: 'pick' | 'ban'
  selected?: boolean
  onClick?: () => void
}

const TIER_STYLE: Record<Tier, string> = {
  S: 'border-lol-gold/35 bg-lol-gold/8 text-lol-gold-light',
  A: 'border-lol-blue/25 bg-lol-blue-dim/20 text-lol-blue',
  B: 'border-teal-500/25 bg-teal-500/8 text-teal-300',
  C: 'border-lol-border bg-lol-surface text-lol-text-dim',
  D: 'border-lol-red/25 bg-lol-red-dim/30 text-lol-red'
}

function tierFromBonus(tierBonus: number): Tier {
  if (tierBonus >= 0.9) return 'S'
  if (tierBonus >= 0.7) return 'A'
  if (tierBonus >= 0.5) return 'B'
  if (tierBonus >= 0.3) return 'C'
  return 'D'
}

export default function ChampionCard({ rec, rank, intent, selected, onClick }: Props): React.JSX.Element {
  const score = Math.round(rec.score)
  const tier = tierFromBonus(rec.breakdown.tierBonus)
  const wr = (rec.breakdown.winRate * 100).toFixed(1)
  const reasons = rec.reasons.length > 0 ? rec.reasons.slice(0, selected ? 3 : 2) : ['Pick consistente']
  const intentColor = intent === 'ban'
    ? 'border-lol-red/25 bg-lol-red-dim/30 text-lol-red'
    : 'border-lol-blue/25 bg-lol-blue-dim/20 text-lol-blue'

  return (
    <button
      className={`
        app-card app-card-hover w-full min-h-[52px] px-2.5 py-2 text-left
        grid grid-cols-[32px_40px_minmax(0,1fr)_auto] items-center gap-2
        ${selected ? 'border-lol-border-bright bg-lol-surface2/30' : ''}
      `}
      onClick={onClick}
    >
      <span className={`text-center text-sm font-bold leading-none ${rank === 1 ? 'text-white' : 'text-lol-text-dim'}`}>
        {rank > 0 ? String(rank).padStart(2, '0') : ''}
      </span>

      <div className={`h-10 w-10 rounded border bg-lol-dark overflow-hidden ${selected ? 'border-lol-border-bright' : 'border-lol-border/70'}`}>
        {rec.champion.iconUrl ? (
          <img src={rec.champion.iconUrl} alt={rec.champion.name} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[10px] text-lol-text-dim">
            {rec.champion.key.slice(0, 2)}
          </span>
        )}
      </div>

      <div className="min-w-0">
        <div className="mb-0.5 flex items-center gap-1.5">
          <span className="truncate text-xs font-semibold text-white">{rec.champion.name}</span>
          {intent && (
            <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold leading-none ${intentColor}`}>
              {intent === 'ban' ? 'BAN' : 'PICK'}
            </span>
          )}
          <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold leading-none ${TIER_STYLE[tier]}`}>
            {tier}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-1.5 gap-y-0.5">
          {reasons.map((reason, index) => (
            <span key={`${reason}-${index}`} className="max-w-[150px] truncate text-[10px] leading-4 text-lol-text-dim">
              {index > 0 ? '· ' : ''}{reason}
            </span>
          ))}
        </div>
      </div>

      <div className="grid min-w-[74px] grid-cols-2 gap-2 text-right">
        <div>
          <div className="text-[9px] uppercase text-lol-text-dim">WR</div>
          <div className="metric-positive text-xs font-bold">{wr}%</div>
        </div>
        <div>
          <div className="text-[9px] uppercase text-lol-text-dim">Score</div>
          <div className="text-xs font-bold text-white">{score}</div>
        </div>
      </div>
    </button>
  )
}
