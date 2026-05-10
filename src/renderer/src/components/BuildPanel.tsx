import React from 'react'
import type { Build } from '@shared/types'

interface Props {
  build: Build
  championName: string
  compact?: boolean
}

const RUNE_PATHS: Record<number, string> = {
  8000: 'Precision', 8100: 'Domination', 8200: 'Sorcery',
  8300: 'Inspiration', 8400: 'Resolve'
}

const PATH_COLOR: Record<number, string> = {
  8000: 'text-yellow-400', 8100: 'text-red-400', 8200: 'text-blue-400',
  8300: 'text-teal-400', 8400: 'text-green-400'
}

function ItemSlot({ itemId, compact = false }: { itemId: number; compact?: boolean }): React.JSX.Element {
  const dim = compact ? 'h-7 w-7' : 'h-8 w-8'
  if (!itemId) {
    return (
      <div className={`${dim} rounded border border-lol-border/60 bg-lol-dark flex items-center justify-center shrink-0`}>
        <div className="h-1.5 w-1.5 rounded-full bg-lol-border/60" />
      </div>
    )
  }
  return (
    <div className={`${dim} rounded border border-lol-border-bright/50 bg-lol-dark overflow-hidden shrink-0`}>
      <img
        src={`ddragon://item/${itemId}`}
        alt={String(itemId)}
        className="h-full w-full object-cover"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    </div>
  )
}

function RuneIcon({ runeId, compact = false }: { runeId: number; compact?: boolean }): React.JSX.Element {
  const dim = compact ? 'h-6 w-6' : 'h-7 w-7'
  if (!runeId) return <div className={`${dim} rounded-full border border-lol-border/60 bg-lol-dark shrink-0`} />
  return (
    <div className={`${dim} rounded-full border border-lol-border/60 bg-lol-dark overflow-hidden shrink-0 flex items-center justify-center`}>
      <img
        src={`ddragon://rune/${runeId}`}
        alt={String(runeId)}
        className="h-full w-full object-cover p-0.5"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    </div>
  )
}

export default function BuildPanel({ build, championName, compact = false }: Props): React.JSX.Element {
  const { items, runes } = build
  const primaryName = RUNE_PATHS[runes.primaryPath] ?? 'Primary'
  const secondaryName = RUNE_PATHS[runes.secondaryPath] ?? 'Secondary'
  const primaryColor = PATH_COLOR[runes.primaryPath] ?? 'text-lol-text'
  const secondaryColor = PATH_COLOR[runes.secondaryPath] ?? 'text-lol-text-dim'
  const itemSlots = Array.from({ length: 6 }, (_, i) => items[i] ?? 0)

  if (compact) {
    return (
      <div className="app-card mt-1 p-2">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="truncate text-[10px] font-bold uppercase text-lol-text">
            Runas · {championName}
          </span>
          <span className={`shrink-0 text-[10px] font-semibold ${primaryColor}`}>{primaryName}</span>
        </div>
        <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
          {(runes.primaryRunes.length > 0 ? runes.primaryRunes : [0, 0, 0, 0]).map((id, i) => (
            <RuneIcon key={`p-${i}`} runeId={id} compact />
          ))}
          <div className="h-5 w-px shrink-0 bg-lol-border/60" />
          {(runes.secondaryRunes.length > 0 ? runes.secondaryRunes : [0, 0]).map((id, i) => (
            <RuneIcon key={`s-${i}`} runeId={id} compact />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="app-card mt-1 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-bold uppercase text-lol-text">Build · {championName}</span>
        <span className="text-[10px] text-lol-text-dim">Lolalytics</span>
      </div>

      <div className="mb-3">
        <p className="mb-1.5 text-[10px] font-bold uppercase text-lol-text-dim">Items</p>
        <div className="flex gap-1.5 flex-wrap">
          {itemSlots.map((id, i) => <ItemSlot key={i} itemId={id} />)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-lol-border/60 pt-3">
        <div className="min-w-0">
          <p className={`mb-1.5 text-[10px] font-bold uppercase ${primaryColor}`}>{primaryName}</p>
          <div className="flex gap-1.5 flex-wrap">
            {(runes.primaryRunes.length > 0 ? runes.primaryRunes : [0, 0, 0, 0]).map((id, i) => (
              <RuneIcon key={i} runeId={id} />
            ))}
          </div>
        </div>
        <div className="min-w-0">
          <p className={`mb-1.5 text-[10px] font-bold uppercase ${secondaryColor}`}>{secondaryName}</p>
          <div className="flex gap-1.5 flex-wrap">
            {(runes.secondaryRunes.length > 0 ? runes.secondaryRunes : [0, 0]).map((id, i) => (
              <RuneIcon key={i} runeId={id} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
