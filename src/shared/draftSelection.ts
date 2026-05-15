import type { DraftState, FocusedChampion } from './types'
import type { Role } from './constants'

export interface AutoFocusCandidate {
  champion: FocusedChampion
  fingerprint: string
}

export function getLocalPickFocus(
  draft: DraftState | null,
  championMap: Record<number, string>
): AutoFocusCandidate | null {
  if (!draft) return null

  const localPlayer = draft.myTeam.find(player => player.cellId === draft.localPlayerCellId)
  if (!localPlayer || localPlayer.championId <= 0 || !localPlayer.assignedPosition) return null

  const championKey = championMap[localPlayer.championId]
  if (!championKey) return null

  return {
    champion: {
      key: championKey,
      name: championKey,
      role: localPlayer.assignedPosition as Role,
      source: 'auto'
    },
    fingerprint: [
      draft.localPlayerCellId,
      localPlayer.championId,
      localPlayer.assignedPosition
    ].join(':')
  }
}

export function shouldApplyAutoFocus(
  previousFingerprint: string | null,
  candidate: AutoFocusCandidate | null
): candidate is AutoFocusCandidate {
  return Boolean(candidate && candidate.fingerprint !== previousFingerprint)
}

export function shouldClearAutoFocus(
  previousFingerprint: string | null,
  candidate: AutoFocusCandidate | null
): boolean {
  return previousFingerprint !== null && candidate === null
}

export function hasRelevantDraftPicks(draft: DraftState | null): boolean {
  if (!draft) return false
  const completedPickIds = new Set(
    draft.actions
      .filter(action => action.type === 'pick' && action.completed && action.championId > 0)
      .map(action => action.championId)
  )
  if (completedPickIds.size > 0) return true

  if (draft.phase !== 'FINALIZATION') return false
  return [...draft.myTeam, ...draft.theirTeam].some(player => player.championId > 0)
}
