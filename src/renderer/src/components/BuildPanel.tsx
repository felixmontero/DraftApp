import React from 'react'
import type { Build } from '@shared/types'

interface Props {
  build: Build
  championName: string
}

const RUNE_PATHS: Record<number, string> = {
  8000: 'Precision', 8100: 'Domination', 8200: 'Sorcery',
  8300: 'Inspiration', 8400: 'Resolve'
}

const PATH_COLOR: Record<number, string> = {
  8000: 'text-yellow-400', 8100: 'text-red-400', 8200: 'text-blue-400',
  8300: 'text-teal-400', 8400: 'text-green-400'
}

function ItemSlot({ itemId }: { itemId: number }): React.JSX.Element {
  if (!itemId) {
    return (
      <div className="w-9 h-9 rounded border border-lol-border bg-lol-dark flex items-center justify-center shrink-0">
        <div className="w-2 h-2 rounded-full bg-lol-border" />
      </div>
    )
  }
  return (
    <div className="w-9 h-9 rounded border border-lol-border-bright bg-lol-dark overflow-hidden shrink-0">
      <img
        src={`ddragon://item/${itemId}`}
        alt={String(itemId)}
        className="w-full h-full object-cover"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    </div>
  )
}

function RuneIcon({ runeId, size = 'md' }: { runeId: number; size?: 'sm' | 'md' }): React.JSX.Element {
  const dim = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8'
  if (!runeId) return <div className={`${dim} rounded-full border border-lol-border bg-lol-dark shrink-0`} />
  return (
    <div className={`${dim} rounded-full border border-lol-border bg-lol-dark overflow-hidden shrink-0 flex items-center justify-center`}>
      <img
        src={`ddragon://rune/${runeId}`}
        alt={String(runeId)}
        className="w-full h-full object-cover p-0.5"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    </div>
  )
}

export default function BuildPanel({ build, championName }: Props): React.JSX.Element {
  const { items, runes } = build
  const primaryName   = RUNE_PATHS[runes.primaryPath]   ?? 'Primary'
  const secondaryName = RUNE_PATHS[runes.secondaryPath] ?? 'Secondary'
  const primaryColor  = PATH_COLOR[runes.primaryPath]   ?? 'text-lol-text'
  const secondaryColor = PATH_COLOR[runes.secondaryPath] ?? 'text-lol-text-dim'

  // Normalise items array to exactly 6 slots
  const itemSlots = Array.from({ length: 6 }, (_, i) => items[i] ?? 0)

  return (
    <div className="bg-lol-dark/60 border border-lol-border rounded-md p-2 mt-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-lol-gold text-xs font-bold uppercase tracking-wider">Build · {championName}</span>
      </div>

      {/* Items */}
      <div className="mb-2">
        <p className="text-lol-text-dim text-xs mb-1 uppercase tracking-wider font-semibold">Items</p>
        <div className="flex gap-1 flex-wrap">
          {itemSlots.map((id, i) => <ItemSlot key={i} itemId={id} />)}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-lol-border my-2" />

      {/* Runes */}
      <div className="flex gap-3">
        {/* Primary */}
        <div className="flex-1">
          <p className={`text-xs font-semibold mb-1 ${primaryColor}`}>{primaryName}</p>
          <div className="flex gap-1 flex-wrap">
            {(runes.primaryRunes.length > 0 ? runes.primaryRunes : [0, 0, 0, 0]).map((id, i) => (
              <RuneIcon key={i} runeId={id} size="md" />
            ))}
          </div>
        </div>

        {/* Secondary */}
        <div className="flex-1">
          <p className={`text-xs font-semibold mb-1 ${secondaryColor}`}>{secondaryName}</p>
          <div className="flex gap-1 flex-wrap">
            {(runes.secondaryRunes.length > 0 ? runes.secondaryRunes : [0, 0]).map((id, i) => (
              <RuneIcon key={i} runeId={id} size="sm" />
            ))}
          </div>
        </div>

        {/* Shards */}
        {runes.shards.length > 0 && (
          <div>
            <p className="text-lol-text-dim text-xs font-semibold mb-1">Shards</p>
            <div className="flex flex-col gap-0.5">
              {runes.shards.map((id, i) => (
                <RuneIcon key={i} runeId={id} size="sm" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
