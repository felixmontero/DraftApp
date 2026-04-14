import React from 'react'
import type { ConnectionStatus } from '@shared/types'

// Fase 2: recibirá estado real via IPC
const STATUS_MOCK: ConnectionStatus = 'disconnected'

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

export default function StatusBar(): React.JSX.Element {
  const { label, sub, textColor, dotColor, bgColor } = statusConfig[STATUS_MOCK]

  return (
    <div className={`flex items-center gap-3 px-3 py-2 ${bgColor} border-b border-lol-border shrink-0`}>
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
      <div className="flex flex-col leading-tight">
        <span className={`text-xs font-semibold ${textColor}`}>{label}</span>
        <span className="text-lol-text-dim text-xs">{sub}</span>
      </div>
    </div>
  )
}
