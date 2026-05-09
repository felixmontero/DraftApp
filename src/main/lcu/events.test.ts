import { describe, expect, it } from 'vitest'
import type { LcuSession } from './types'
import { parseSession } from './events'

function fixtureSession(overrides: Partial<LcuSession> = {}): LcuSession {
  return {
    localPlayerCellId: 2,
    myTeam: [
      { cellId: 1, championId: 0, assignedPosition: 'top', summonerId: 101 },
      { cellId: 2, championId: 222, assignedPosition: 'bottom', summonerId: 102 }
    ],
    theirTeam: [
      { cellId: 6, championId: 157, assignedPosition: 'middle', summonerId: 201 },
      { cellId: 7, championId: 0, assignedPosition: 'support', summonerId: 202 }
    ],
    actions: [
      [
        { id: 11, type: 'ban', championId: 0, completed: false, isAllyAction: true, isInProgress: true },
        { id: 12, type: 'ban', championId: 0, completed: false, isAllyAction: false, isInProgress: false }
      ],
      [
        { id: 21, type: 'pick', championId: 222, completed: true, isAllyAction: true, isInProgress: false }
      ]
    ],
    timer: {
      adjustedTimeLeftInPhase: 27000,
      phase: 'BAN_PICK'
    },
    ...overrides
  }
}

describe('parseSession', () => {
  it('flattens actions and keeps active draft context', () => {
    const parsed = parseSession(fixtureSession())

    expect(parsed.localPlayerCellId).toBe(2)
    expect(parsed.phase).toBe('BAN_PICK')
    expect(parsed.timeLeftMs).toBe(27000)
    expect(parsed.actions).toHaveLength(3)
    expect(parsed.actions[0]).toMatchObject({
      id: 11,
      type: 'ban',
      isAllyAction: true,
      isInProgress: true
    })
  })

  it('normalizes support role to utility', () => {
    const parsed = parseSession(fixtureSession())

    expect(parsed.theirTeam[1].assignedPosition).toBe('utility')
  })
})
