import React from 'react'
import type { DraftState, DraftPlayer } from '@shared/types'

interface Props {
  draft: DraftState | null
}

const ROLE_LABELS: Record<string, string> = {
  top: 'TOP',
  jungle: 'JGL',
  middle: 'MID',
  bottom: 'BOT',
  utility: 'SUP',
  '': '?'
}

const PATCH = '14.13.1'

function championIcon(championId: number): string | null {
  if (!championId) return null
  // Fase 3: usará el mapa de nombres de Data Dragon
  // Por ahora devuelve null — se reemplazará con el icono correcto
  return null
}

function BanSlot({ championId, side }: { championId: number; side: 'ally' | 'enemy' }): React.JSX.Element {
  const icon = championIcon(championId)
  const isEmpty = !championId

  return (
    <div className={`
      w-8 h-8 rounded border flex items-center justify-center overflow-hidden
      ${side === 'ally'
        ? isEmpty ? 'border-lol-border bg-lol-surface' : 'border-lol-border-bright bg-lol-surface'
        : isEmpty ? 'border-lol-red/30 bg-lol-red-dim/40' : 'border-lol-red/60 bg-lol-red-dim'}
    `}>
      {icon
        ? <img src={icon} className="w-full h-full object-cover grayscale opacity-70" alt="" />
        : <div className={`w-3 h-0.5 rounded ${isEmpty ? 'bg-lol-text-dim/30' : 'bg-lol-text-dim'}`} />
      }
    </div>
  )
}

function PickSlot({ player, side, isLocal }: { player: DraftPlayer; side: 'ally' | 'enemy'; isLocal: boolean }): React.JSX.Element {
  const roleLabel = ROLE_LABELS[player.assignedPosition] ?? '?'
  const hasChamp = player.championId > 0
  const icon = championIcon(player.championId)

  return (
    <div className={`
      flex items-center gap-1.5 px-2 h-9 rounded border transition-all
      ${isLocal ? 'border-lol-gold/50 bg-lol-gold/5' : ''}
      ${!isLocal && side === 'ally' ? 'border-lol-border bg-lol-surface hover:border-lol-border-bright' : ''}
      ${side === 'enemy' ? 'border-lol-red/30 bg-lol-red-dim/40 hover:border-lol-red/50 flex-row-reverse' : ''}
    `}>
      {/* Avatar */}
      <div className={`
        w-6 h-6 rounded shrink-0 border overflow-hidden flex items-center justify-center
        ${hasChamp
          ? side === 'ally' ? 'border-lol-border-bright' : 'border-lol-red/50'
          : 'border-lol-border bg-lol-dark'}
      `}>
        {icon
          ? <img src={icon} className="w-full h-full object-cover" alt="" />
          : hasChamp
            ? <div className="w-2 h-2 rounded-full bg-lol-border-bright/50" />
            : null
        }
      </div>
      {/* Rol */}
      <span className={`text-xs font-medium ${
        isLocal ? 'text-lol-gold-light' :
        side === 'ally' ? 'text-lol-text' : 'text-lol-text-dim'
      }`}>
        {roleLabel}
      </span>
      {/* Indicador "tú" */}
      {isLocal && (
        <span className="text-lol-gold text-xs ml-auto">▶</span>
      )}
    </div>
  )
}

export default function DraftBoard({ draft }: Props): React.JSX.Element {
  // Obtener bans de las acciones del draft
  const allyBans = draft
    ? draft.actions.filter(a => a.type === 'ban' && a.isAllyAction).slice(0, 5)
    : []
  const enemyBans = draft
    ? draft.actions.filter(a => a.type === 'ban' && !a.isAllyAction).slice(0, 5)
    : []

  const phase = draft?.phase ?? 'NONE'
  const phaseLabel = phase === 'PLANNING' ? 'Preparación'
    : phase === 'BAN_PICK' ? 'Bans y Picks'
    : phase === 'FINALIZATION' ? 'Finalización'
    : 'Esperando partida'

  return (
    <div className="bg-lol-surface border border-lol-border rounded-md shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-lol-dark/60 border-b border-lol-border">
        <span className="text-lol-gold text-xs font-bold uppercase tracking-wider">Draft</span>
        <span className={`text-xs ${draft ? 'text-lol-gold-light' : 'text-lol-text-dim'}`}>
          {phaseLabel}
        </span>
      </div>

      <div className="p-2 space-y-2">
        {/* Bans */}
        <div>
          <div className="flex items-center gap-1 mb-1.5">
            <span className="text-lol-text-dim text-xs uppercase tracking-wide">Bans</span>
            <div className="flex-1 h-px bg-lol-border" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <BanSlot key={i} side="ally" championId={allyBans[i]?.championId ?? 0} />
              ))}
            </div>
            <div className="w-px h-6 bg-lol-border mx-1" />
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <BanSlot key={i} side="enemy" championId={enemyBans[i]?.championId ?? 0} />
              ))}
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
            {/* Aliados */}
            <div className="flex flex-col gap-1 flex-1">
              <div className="text-center mb-0.5">
                <span className="text-lol-blue text-xs font-semibold">Aliados</span>
              </div>
              {draft
                ? draft.myTeam.map(player => (
                  <PickSlot
                    key={player.cellId}
                    player={player}
                    side="ally"
                    isLocal={player.cellId === draft.localPlayerCellId}
                  />
                ))
                : Array.from({ length: 5 }).map((_, i) => (
                  <PickSlot key={i} player={{ cellId: i, championId: 0, assignedPosition: '', summonerId: 0 }} side="ally" isLocal={false} />
                ))
              }
            </div>
            {/* Enemigos */}
            <div className="flex flex-col gap-1 flex-1">
              <div className="text-center mb-0.5">
                <span className="text-lol-red text-xs font-semibold">Enemigos</span>
              </div>
              {draft
                ? draft.theirTeam.map(player => (
                  <PickSlot key={player.cellId} player={player} side="enemy" isLocal={false} />
                ))
                : Array.from({ length: 5 }).map((_, i) => (
                  <PickSlot key={i} player={{ cellId: i, championId: 0, assignedPosition: '', summonerId: 0 }} side="enemy" isLocal={false} />
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
