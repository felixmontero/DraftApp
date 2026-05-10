import React from 'react'
import type { DraftAction, DraftState, DraftPlayer, FocusedChampion } from '@shared/types'
import type { Role } from '@shared/constants'

interface Props {
  draft: DraftState | null
  patch: string
  championMap: Record<number, string>
  onFocusChampion?: (champion: FocusedChampion) => void
}

const ROLE_LABELS: Record<string, string> = {
  top: 'TOP',
  jungle: 'JGL',
  middle: 'MID',
  bottom: 'BOT',
  utility: 'SUP',
  '': '?'
}

function championIcon(championId: number): string | null {
  if (!championId) return null
  return `ddragon://${championId}.png`
}

function formatTimer(ms: number): string {
  if (!ms || ms <= 0) return '0s'
  return `${Math.ceil(ms / 1000)}s`
}

function BanSlot({ championId, side, active }: { championId: number; side: 'ally' | 'enemy'; active?: boolean }): React.JSX.Element {
  const icon = championIcon(championId)
  const isEmpty = !championId

  return (
    <div className={`
      w-10 h-10 rounded border flex items-center justify-center overflow-hidden shrink-0
      ${active ? 'ring-1 ring-lol-gold shadow-gold' : ''}
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

function PickSlot({
  player,
  side,
  isLocal,
  championMap,
  onFocusChampion
}: {
  player: DraftPlayer
  side: 'ally' | 'enemy'
  isLocal: boolean
  championMap: Record<number, string>
  onFocusChampion?: (champion: FocusedChampion) => void
}): React.JSX.Element {
  const roleLabel = ROLE_LABELS[player.assignedPosition] ?? '?'
  const hasChamp = player.championId > 0
  const champName = hasChamp ? (championMap[player.championId] ?? `#${player.championId}`) : null
  const icon = championIcon(player.championId)
  const clickable = Boolean(side === 'ally' && hasChamp && champName && player.assignedPosition)
  const handleClick = (): void => {
    if (!clickable || !champName) return
    onFocusChampion?.({
      key: champName,
      name: champName,
      role: player.assignedPosition as Role
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!clickable}
      title={clickable ? 'Ver build y runas' : undefined}
      className={`
      w-full text-left
      flex items-center gap-2 px-2.5 h-11 rounded border transition-all
      ${clickable ? 'cursor-pointer hover:border-lol-gold hover:bg-lol-gold/10' : 'cursor-default'}
      ${isLocal ? 'border-lol-gold/60 bg-lol-gold/8' : ''}
      ${!isLocal && side === 'ally' ? 'border-lol-border bg-lol-surface hover:border-lol-border-bright' : ''}
      ${side === 'enemy' ? 'border-lol-red/30 bg-lol-red-dim/40 hover:border-lol-red/50 flex-row-reverse' : ''}
    `}>
      {/* Avatar */}
      <div className={`
        w-8 h-8 rounded shrink-0 border overflow-hidden flex items-center justify-center
        ${hasChamp
          ? side === 'ally' ? 'border-lol-border-bright' : 'border-lol-red/50'
          : 'border-lol-border bg-lol-dark'}
      `}>
        {icon
          ? <img src={icon} className="w-full h-full object-cover" alt={champName ?? ''} />
          : hasChamp
            ? <div className="w-2.5 h-2.5 rounded-full bg-lol-border-bright/50" />
            : null
        }
      </div>
      {/* Nombre o Rol */}
      <span className={`text-sm font-medium truncate ${
        isLocal ? 'text-lol-gold-light' :
        side === 'ally' ? 'text-lol-text' : 'text-lol-text-dim'
      }`}>
        {champName ?? roleLabel}
      </span>
      {isLocal && (
        <span className="text-lol-gold text-sm ml-auto shrink-0">▶</span>
      )}
      {!isLocal && clickable && (
        <span className="ml-auto shrink-0 text-[10px] font-bold uppercase text-lol-text-dim">Build</span>
      )}
    </button>
  )
}

export default function DraftBoard({ draft, patch: _patch, championMap, onFocusChampion }: Props): React.JSX.Element {
  const allyBans = draft
    ? draft.actions.filter((a: DraftAction) => a.type === 'ban' && a.isAllyAction).slice(0, 5)
    : []
  const enemyBans = draft
    ? draft.actions.filter((a: DraftAction) => a.type === 'ban' && !a.isAllyAction).slice(0, 5)
    : []

  const phase = draft?.phase ?? 'NONE'
  const currentAction = draft?.actions.find(action => action.isInProgress)
  const currentActionLabel = currentAction
    ? `${currentAction.type === 'ban' ? 'Ban' : 'Pick'} ${currentAction.isAllyAction ? 'aliado' : 'rival'}`
    : null
  const phaseLabel = phase === 'PLANNING' ? 'Preparación'
    : phase === 'BAN_PICK' ? 'Bans y Picks'
    : phase === 'FINALIZATION' ? 'Finalización'
    : 'Esperando partida'

  return (
    <div className="bg-lol-surface border border-lol-border rounded-md shrink-0 overflow-hidden basis-[45%] min-w-[360px] max-w-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 bg-lol-dark/60 border-b border-lol-border">
        <span className="text-lol-gold text-sm font-bold uppercase tracking-wider">Draft</span>
        <div className="flex items-center gap-2 min-w-0">
          {draft && currentActionLabel && (
            <span className="text-lol-gold-light text-xs font-semibold truncate">
              {currentActionLabel} · {formatTimer(draft.timeLeftMs)}
            </span>
          )}
          <span className="text-lol-text-dim text-sm truncate">{phaseLabel}</span>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Bans */}
        <div>
          <div className="flex items-center mb-1.5">
            <span className="text-lol-blue text-xs font-bold w-[50%] text-center">Aliados</span>
            <span className="text-lol-text-dim text-xs uppercase tracking-widest font-semibold shrink-0 px-1">Bans</span>
            <span className="text-lol-red text-xs font-bold w-[50%] text-center">Enemigos</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex gap-1 flex-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <BanSlot
                  key={i}
                  side="ally"
                  championId={allyBans[i]?.championId ?? 0}
                  active={allyBans[i]?.id === currentAction?.id}
                />
              ))}
            </div>
            <div className="w-px h-8 bg-lol-border shrink-0 mx-0.5" />
            <div className="flex gap-1 flex-1 justify-end">
              {Array.from({ length: 5 }).map((_, i) => (
                <BanSlot
                  key={i}
                  side="enemy"
                  championId={enemyBans[i]?.championId ?? 0}
                  active={enemyBans[i]?.id === currentAction?.id}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Picks */}
        <div>
          <div className="h-px bg-lol-border mb-2" />
          <div className="flex gap-2">
            {/* Aliados */}
            <div className="flex flex-col gap-1.5 flex-1">
              {draft
                ? draft.myTeam.map(player => (
                  <PickSlot
                    key={player.cellId}
                    player={player}
                    side="ally"
                    isLocal={player.cellId === draft.localPlayerCellId}
                    championMap={championMap}
                    onFocusChampion={onFocusChampion}
                  />
                ))
                : Array.from({ length: 5 }).map((_, i) => (
                  <PickSlot key={i} player={{ cellId: i, championId: 0, assignedPosition: '', summonerId: 0 }} side="ally" isLocal={false} championMap={championMap} />
                ))
              }
            </div>
            {/* Enemigos */}
            <div className="flex flex-col gap-1.5 flex-1">
              {draft
                ? draft.theirTeam.map(player => (
                  <PickSlot key={player.cellId} player={player} side="enemy" isLocal={false} championMap={championMap} />
                ))
                : Array.from({ length: 5 }).map((_, i) => (
                  <PickSlot key={i} player={{ cellId: i, championId: 0, assignedPosition: '', summonerId: 0 }} side="enemy" isLocal={false} championMap={championMap} />
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
