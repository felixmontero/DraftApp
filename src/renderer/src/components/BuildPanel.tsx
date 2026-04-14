import React from 'react'
import type { Build } from '@shared/types'

// Fase 5: mostrará build real del campeón seleccionado
interface Props {
  build: Build | null
}

export default function BuildPanel({ build }: Props): React.JSX.Element | null {
  if (!build) return null

  return (
    <div className="bg-lol-dark/40 border border-lol-border rounded p-2 shrink-0">
      <p className="text-lol-gold text-xs font-semibold uppercase tracking-wider mb-2">Build</p>
      {/* TODO Fase 5: renderizar items y runas */}
      <p className="text-gray-600 text-xs">Items y runas — Fase 5</p>
    </div>
  )
}
