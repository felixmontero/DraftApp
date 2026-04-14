import React from 'react'
import type { DraftState, DraftPlayer } from '@shared/types'
interface Props {
  draft: DraftState | null
  patch: string
  championMap: Record<number, string>
}

const ROLE_LABELS: Record<string, string> = {
  top: 'TOP',
  jungle: 'JGL',
  middle: 'MID',
  bottom: 'BOT',
  utility: 'SUP',
  '': '?'
}

function championIcon(championId: number, _patch: string, _championMap: Record<number, string>): string | null {
  if (!championId) return null
  // Protocolo custom — proxeado por proceso principal via Community Dragon
  return `ddragon://${championId}.png`
}

function BanSlot({ championId, side, patch, championMap }: { championId: number; side: 'ally' | 'enemy'; patch: string; championMap: Record<number, string> }): React.JSX.Element {
  const icon = championIcon(championId, patch, championMap)
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

function PickSlot({ player, side, isLocal, patch, championMap }: { player: DraftPlayer; side: 'ally' | 'enemy'; isLocal: boolean; patch: string; championMap: Record<number, string> }): React.JSX.Element {
  const roleLabel = ROLE_LABELS[player.assignedPosition] ?? '?'
  const hasChamp = player.championId > 0
  const champName = hasChamp ? (championMap[player.championId] ?? `#${player.championId}`) : null
  const icon = championIcon(player.championId, patch, championMap)

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
          ? <img src={icon} className="w-full h-full object-cover" alt={champName ?? ''} />
          : hasChamp
            ? <div className="w-2 h-2 rounded-full bg-lol-border-bright/50" />
            : null
        }
      </div>
      {/* Nombre del campeón o Rol */}
      <span className={`text-xs font-medium truncate ${
        isLocal ? 'text-lol-gold-light' :
        side === 'ally' ? 'text-lol-text' : 'text-lol-text-dim'
      }`}>
        {champName ?? roleLabel}
      </span>
      {/* Indicador "tú" */}
      {isLocal && (
        <span className="text-lol-gold text-xs ml-auto shrink-0">▶</span>
      )}
    </div>
  )
}

export default function DraftBoard({ draft, patch, championMap }: Props): React.JSX.Element {
  // Obtener bans de las acciones del draft
  const allyBans = draft
    ? draft.actions.filter((a: any) => a.type === 'ban' && a.isAllyAction).slice(0, 5)
    : []
  const enemyBans = draft
    ? draft.actions.filter((a: any) => a.type === 'ban' && !a.isAllyAction).slice(0, 5)
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
                <BanSlot key={i} side="ally" championId={allyBans[i]?.championId ?? 0} patch={patch} championMap={championMap} />
              ))}
            </div>
            <div className="w-px h-6 bg-lol-border mx-1" />
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <BanSlot key={i} side="enemy" championId={enemyBans[i]?.championId ?? 0} patch={patch} championMap={championMap} />
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
                    patch={patch}
                    championMap={championMap}
                  />
                ))
                : Array.from({ length: 5 }).map((_, i) => (
                  <PickSlot key={i} player={{ cellId: i, championId: 0, assignedPosition: '', summonerId: 0 }} side="ally" isLocal={false} patch={patch} championMap={championMap} />
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
                  <PickSlot key={player.cellId} player={player} side="enemy" isLocal={false} patch={patch} championMap={championMap} />
                ))
                : Array.from({ length: 5 }).map((_, i) => (
                  <PickSlot key={i} player={{ cellId: i, championId: 0, assignedPosition: '', summonerId: 0 }} side="enemy" isLocal={false} patch={patch} championMap={championMap} />
                ))
              }
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
