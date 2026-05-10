import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import type { LcuSession } from './types'
import { parseSession } from './events'

function loadFixture(name: string): LcuSession {
  const fixtureUrl = new URL(`./__fixtures__/${name}.json`, import.meta.url)
  return JSON.parse(readFileSync(fixtureUrl, 'utf8')) as LcuSession
}

describe('parseSession', () => {
  it('flattens actions and keeps active draft context', () => {
    const parsed = parseSession(loadFixture('champ-select-ban-turn'))

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
    const parsed = parseSession(loadFixture('champ-select-ban-turn'))

    expect(parsed.theirTeam[1].assignedPosition).toBe('utility')
  })
})
