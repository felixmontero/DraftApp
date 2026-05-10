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
  const sideClass = side === 'ally'
    ? 'border-lol-blue/30 bg-lol-blue-dim/15'
    : 'border-lol-red/35 bg-lol-red-dim/35'

  return (
    <div className={`
      h-8 w-8 rounded-md border flex items-center justify-center overflow-hidden shrink-0
      ${active ? 'border-lol-gold/60 ring-1 ring-lol-gold/40' : sideClass}
    `}>
      {icon
        ? <img src={icon} className="w-full h-full object-cover grayscale opacity-75" alt="" />
        : <div className={`h-px w-3 rounded ${isEmpty ? 'bg-lol-text-dim/35' : 'bg-lol-text-dim'}`} />
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
        app-card app-card-hover h-10 w-full border-l-2 px-2 text-left
        flex items-center gap-2
        ${side === 'ally' ? 'team-ally' : 'team-enemy flex-row-reverse'}
        ${isLocal ? 'bg-lol-gold/5' : ''}
        ${clickable ? 'cursor-pointer' : 'cursor-default'}
      `}
    >
      <div className={`
        h-7 w-7 rounded border overflow-hidden flex items-center justify-center shrink-0 bg-lol-dark
        ${side === 'ally' ? 'border-lol-blue/35' : 'border-lol-red/35'}
      `}>
        {icon
          ? <img src={icon} className="w-full h-full object-cover" alt={champName ?? ''} />
          : hasChamp
            ? <div className="w-2 h-2 rounded-full bg-lol-border-bright/50" />
            : null
        }
      </div>
      <span className="w-8 shrink-0 text-[10px] font-bold text-lol-text-dim">{roleLabel}</span>
      <span className={`min-w-0 flex-1 truncate text-xs font-semibold ${
        isLocal ? 'text-lol-gold-light' :
        side === 'ally' ? 'text-lol-text' : 'text-lol-text-dim'
      }`}>
        {champName ?? 'Pendiente'}
      </span>
      {isLocal && <span className="shrink-0 text-[10px] font-bold text-lol-gold">TU</span>}
      {!isLocal && clickable && <span className="shrink-0 text-[10px] font-bold uppercase text-lol-text-dim">Build</span>}
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
  const phaseLabel = phase === 'PLANNING' ? 'Preparacion'
    : phase === 'BAN_PICK' ? 'Bans y Picks'
    : phase === 'FINALIZATION' ? 'Finalizacion'
    : 'Esperando partida'

  return (
    <div className="app-panel shrink-0 overflow-hidden basis-[45%] min-w-[360px] max-w-[500px]">
      <div className="app-header flex items-center justify-between gap-3">
        <span className="text-lol-gold text-xs font-bold uppercase tracking-[0.18em]">Draft</span>
        <div className="flex items-center gap-2 min-w-0">
          {draft && currentActionLabel && (
            <span className="text-lol-gold-light text-[11px] font-semibold truncate">
              {currentActionLabel} - {formatTimer(draft.timeLeftMs)}
            </span>
          )}
          <span className="text-lol-text-dim text-[11px] truncate">{phaseLabel}</span>
        </div>
      </div>

      <div className="p-3 space-y-3">
        <div className="app-card p-2">
          <div className="mb-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <span className="text-lol-blue text-[10px] font-bold uppercase tracking-wider">Aliados</span>
            <span className="text-lol-text-dim text-[10px] uppercase tracking-[0.18em] font-semibold">Bans</span>
            <span className="text-lol-red text-[10px] font-bold uppercase tracking-wider text-right">Enemigos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex gap-1.5 flex-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <BanSlot key={i} side="ally" championId={allyBans[i]?.championId ?? 0} active={allyBans[i]?.id === currentAction?.id} />
              ))}
            </div>
            <div className="h-6 w-px bg-lol-border shrink-0" />
            <div className="flex gap-1.5 flex-1 justify-end">
              {Array.from({ length: 5 }).map((_, i) => (
                <BanSlot key={i} side="enemy" championId={enemyBans[i]?.championId ?? 0} active={enemyBans[i]?.id === currentAction?.id} />
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5">
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
          <div className="flex flex-col gap-1.5">
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
  )
}
