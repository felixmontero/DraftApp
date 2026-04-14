import React from 'react'

// Fase 2: recibirá draft state real via IPC

const ROLES = ['TOP', 'JGL', 'MID', 'BOT', 'SUP']

function BanSlot({ side }: { side: 'ally' | 'enemy' }): React.JSX.Element {
  return (
    <div className={`
      w-8 h-8 rounded border flex items-center justify-center
      ${side === 'ally'
        ? 'border-lol-border bg-lol-surface'
        : 'border-lol-red/40 bg-lol-red-dim/60'}
    `}>
      <svg className="w-3 h-3 text-lol-text-dim opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
      </svg>
    </div>
  )
}

function PickSlot({ side, role }: { side: 'ally' | 'enemy'; role: string }): React.JSX.Element {
  return (
    <div className={`
      flex items-center gap-1.5 px-2 h-9 rounded border transition-colors
      ${side === 'ally'
        ? 'border-lol-border bg-lol-surface hover:border-lol-border-bright'
        : 'border-lol-red/30 bg-lol-red-dim/40 hover:border-lol-red/50'}
      ${side === 'enemy' ? 'flex-row-reverse' : ''}
    `}>
      {/* Avatar placeholder */}
      <div className={`
        w-6 h-6 rounded shrink-0 border
        ${side === 'ally' ? 'border-lol-border-bright/40 bg-lol-dark' : 'border-lol-red/30 bg-lol-dark'}
      `} />
      <span className={`text-xs font-medium ${side === 'ally' ? 'text-lol-text-dim' : 'text-lol-text-dim'}`}>
        {role}
      </span>
    </div>
  )
}

export default function DraftBoard(): React.JSX.Element {
  return (
    <div className="bg-lol-surface border border-lol-border rounded-md shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-lol-dark/60 border-b border-lol-border">
        <span className="text-lol-gold text-xs font-bold uppercase tracking-wider">Draft</span>
        <span className="text-lol-text-dim text-xs">Esperando partida</span>
      </div>

      <div className="p-2 space-y-2">
        {/* Bans */}
        <div>
          <div className="flex items-center gap-1 mb-1.5">
            <span className="text-lol-text-dim text-xs uppercase tracking-wide">Bans</span>
            <div className="flex-1 h-px bg-lol-border" />
          </div>
          <div className="flex items-center justify-between gap-1">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => <BanSlot key={i} side="ally" />)}
            </div>
            <div className="w-px h-6 bg-lol-border" />
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => <BanSlot key={i} side="enemy" />)}
            </div>
          </div>
        </div>

        {/* Picks */}
        <div>
          <div className="flex items-center gap-1 mb-1.5">
            <span className="text-lol-text-dim text-xs uppercase tracking-wide">Picks</span>
            <div className="flex-1 h-px bg-lol-border" />
          </div>
          <div className="flex gap-2">
            {/* Equipo aliado */}
            <div className="flex flex-col gap-1 flex-1">
              <div className="text-center mb-0.5">
                <span className="text-lol-blue text-xs font-semibold">Aliados</span>
              </div>
              {ROLES.map(role => <PickSlot key={role} side="ally" role={role} />)}
            </div>
            {/* Equipo enemigo */}
            <div className="flex flex-col gap-1 flex-1">
              <div className="text-center mb-0.5">
                <span className="text-lol-red text-xs font-semibold">Enemigos</span>
              </div>
              {ROLES.map(role => <PickSlot key={role} side="enemy" role={role} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
