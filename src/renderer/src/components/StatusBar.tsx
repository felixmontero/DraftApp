import React from 'react'
import type { ConnectionStatus, DraftAction, DraftState } from '@shared/types'

interface Props {
  connection: ConnectionStatus
  draft?: DraftState | null
}

const statusConfig: Record<ConnectionStatus, {
  label: string
  sub: string
  textColor: string
  dotColor: string
  bgColor: string
}> = {
  disconnected: {
    label: 'Sin conexión',
    sub: 'Abre el cliente de League of Legends',
    textColor: 'text-lol-text-dim',
    dotColor: 'bg-lol-text-dim',
    bgColor: 'bg-lol-dark/80'
  },
  connected: {
    label: 'Conectado',
    sub: 'En lobby — esperando partida',
    textColor: 'text-lol-blue',
    dotColor: 'bg-lol-blue',
    bgColor: 'bg-lol-blue-dim/20'
  },
  in_draft: {
    label: 'Champion Select',
    sub: 'Analizando draft...',
    textColor: 'text-lol-gold-light',
    dotColor: 'bg-lol-gold animate-pulse',
    bgColor: 'bg-lol-gold/10'
  }
}

function formatTimer(ms: number): string {
  if (!ms || ms <= 0) return '0s'
  return `${Math.ceil(ms / 1000)}s`
}

function actionLabel(action?: DraftAction): string | null {
  if (!action) return null
  const side = action.isAllyAction ? 'aliado' : 'rival'
  const type = action.type === 'ban' ? 'ban' : 'pick'
  return `${type} ${side}`
}

export default function StatusBar({ connection, draft }: Props): React.JSX.Element {
  const { label, sub, textColor, dotColor, bgColor } = statusConfig[connection]
  const currentAction = draft?.actions.find(action => action.isInProgress)
  const draftContext = draft
    ? [actionLabel(currentAction), formatTimer(draft.timeLeftMs)].filter(Boolean).join(' · ')
    : null

  return (
    <div className={`flex items-center gap-3 px-3 py-2 ${bgColor} border-b border-lol-border shrink-0 transition-colors duration-500`}>
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
      <div className="flex flex-col leading-tight min-w-0">
        <span className={`text-xs font-semibold ${textColor}`}>{label}</span>
        <span className="text-lol-text-dim text-xs truncate">{draftContext ?? sub}</span>
      </div>
    </div>
  )
}
