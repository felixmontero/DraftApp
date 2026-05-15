import { describe, expect, it } from 'vitest'
import type { DraftState } from './types'
import { getLocalPickFocus, hasRelevantDraftPicks, shouldApplyAutoFocus, shouldClearAutoFocus } from './draftSelection'

function draft(overrides: Partial<DraftState> = {}): DraftState {
  return {
    localPlayerCellId: 1,
    myTeam: [
      { cellId: 1, championId: 0, assignedPosition: 'middle', summonerId: 10 }
    ],
    theirTeam: [],
    actions: [],
    phase: 'BAN_PICK',
    timeLeftMs: 25000,
    ...overrides
  }
}

describe('getLocalPickFocus', () => {
  it('does not select a build when the local player has no champion', () => {
    expect(getLocalPickFocus(draft(), { 103: 'Ahri' })).toBeNull()
  })

  it('does not select a build before the local role is known', () => {
    expect(getLocalPickFocus(
      draft({ myTeam: [{ cellId: 1, championId: 103, assignedPosition: '', summonerId: 10 }] }),
      { 103: 'Ahri' }
    )).toBeNull()
  })

  it('returns a stable fingerprint for the local champion and role', () => {
    const focus = getLocalPickFocus(
      draft({ myTeam: [{ cellId: 1, championId: 103, assignedPosition: 'middle', summonerId: 10 }] }),
      { 103: 'Ahri' }
    )

    expect(focus).toEqual({
      champion: { key: 'Ahri', name: 'Ahri', role: 'middle', source: 'auto' },
      fingerprint: '1:103:middle'
    })
  })

  it('changes fingerprint when the local champion changes before lock-in', () => {
    const first = getLocalPickFocus(
      draft({ myTeam: [{ cellId: 1, championId: 103, assignedPosition: 'middle', summonerId: 10 }] }),
      { 103: 'Ahri', 157: 'Yasuo' }
    )
    const second = getLocalPickFocus(
      draft({ myTeam: [{ cellId: 1, championId: 157, assignedPosition: 'middle', summonerId: 10 }] }),
      { 103: 'Ahri', 157: 'Yasuo' }
    )

    expect(first?.fingerprint).toBe('1:103:middle')
    expect(second?.fingerprint).toBe('1:157:middle')
  })

  it('uses fingerprint state to avoid duplicate auto-build loads', () => {
    const focus = getLocalPickFocus(
      draft({ myTeam: [{ cellId: 1, championId: 103, assignedPosition: 'middle', summonerId: 10 }] }),
      { 103: 'Ahri' }
    )

    expect(shouldApplyAutoFocus(null, focus)).toBe(true)
    expect(shouldApplyAutoFocus('1:103:middle', focus)).toBe(false)
  })

  it('signals when the previous automatic pick should be cleared', () => {
    expect(shouldClearAutoFocus('1:103:middle', null)).toBe(true)
    expect(shouldClearAutoFocus(null, null)).toBe(false)
  })
})

describe('hasRelevantDraftPicks', () => {
  it('rejects null or empty drafts', () => {
    expect(hasRelevantDraftPicks(null)).toBe(false)
    expect(hasRelevantDraftPicks(draft())).toBe(false)
  })

  it('accepts drafts with any ally or enemy champion selected', () => {
    expect(hasRelevantDraftPicks(
      draft({
        actions: [{ id: 1, type: 'pick', championId: 222, completed: true, isAllyAction: false, isInProgress: false }],
        theirTeam: [{ cellId: 6, championId: 222, assignedPosition: 'bottom', summonerId: 20 }]
      })
    )).toBe(true)
  })

  it('rejects non-final drafts that only contain hovered champions', () => {
    expect(hasRelevantDraftPicks(
      draft({ theirTeam: [{ cellId: 6, championId: 222, assignedPosition: 'bottom', summonerId: 20 }] })
    )).toBe(false)
  })

  it('accepts finalization drafts with selected champions even without action history', () => {
    expect(hasRelevantDraftPicks(
      draft({
        phase: 'FINALIZATION',
        myTeam: [{ cellId: 1, championId: 103, assignedPosition: 'middle', summonerId: 10 }]
      })
    )).toBe(true)
  })
})
