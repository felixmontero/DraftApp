import React from 'react'
import type { UserSettings } from '@shared/types'

interface Props {
  settings: UserSettings | null
  compactMode: boolean
  onToggleCompact: () => void
  onToggleAlwaysOnTop: () => void
  onResetBounds: () => void
  onClose: () => void
}

function ToggleRow({
  label,
  checked,
  onClick
}: {
  label: string
  checked: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded border border-lol-border bg-lol-surface2 px-3 py-2 text-left hover:border-lol-border-bright"
    >
      <span className="text-xs font-semibold text-lol-text">{label}</span>
      <span
        className={`flex h-5 w-9 items-center rounded-full border px-0.5 transition-colors ${
          checked ? 'justify-end border-lol-gold/60 bg-lol-gold/20' : 'justify-start border-lol-border bg-lol-dark'
        }`}
      >
        <span className={`h-3.5 w-3.5 rounded-full ${checked ? 'bg-lol-gold-light' : 'bg-lol-text-dim'}`} />
      </span>
    </button>
  )
}

export default function SettingsPanel({
  settings,
  compactMode,
  onToggleCompact,
  onToggleAlwaysOnTop,
  onResetBounds,
  onClose
}: Props): React.JSX.Element {
  const alwaysOnTop = settings?.overlay.alwaysOnTop ?? true

  return (
    <div className="absolute right-3 top-11 z-20 w-72 rounded-md border border-lol-border bg-lol-panel shadow-2xl">
      <div className="flex items-center justify-between border-b border-lol-border bg-lol-dark/70 px-3 py-2">
        <span className="text-xs font-bold uppercase tracking-wider text-lol-gold">Ajustes</span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded text-lol-text-dim hover:bg-lol-surface2 hover:text-white"
          title="Cerrar"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M1 1l8 8M9 1l-8 8" />
          </svg>
        </button>
      </div>

      <div className="space-y-2 p-3">
        <ToggleRow label="Modo compacto" checked={compactMode} onClick={onToggleCompact} />
        <ToggleRow label="Siempre visible" checked={alwaysOnTop} onClick={onToggleAlwaysOnTop} />
        <button
          type="button"
          onClick={onResetBounds}
          className="flex w-full items-center justify-between rounded border border-lol-border bg-lol-surface2 px-3 py-2 text-xs font-semibold text-lol-text hover:border-lol-border-bright hover:text-white"
        >
          <span>Restaurar ventana</span>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8a5 5 0 1 0 1.4-3.5" />
            <path d="M3 3.5V7h3.5" />
          </svg>
        </button>
      </div>
    </div>
  )
}
