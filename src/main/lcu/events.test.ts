import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import type { LcuSession } from './types'
import { parseChampSelectMessage, parseSession } from './events'

function loadFixture(name: string): LcuSession {
  const fixtureUrl = new URL(`./__fixtures__/${name}.json`, import.meta.url)
  return JSON.parse(readFileSync(fixtureUrl, 'utf8')) as LcuSession
}

function loadRawFixture(name: string): string {
  const fixtureUrl = new URL(`./__fixtures__/${name}.json`, import.meta.url)
  return readFileSync(fixtureUrl, 'utf8')
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

  it('keeps ally pick turn details', () => {
    const parsed = parseSession(loadFixture('champ-select-ally-pick'))
    const activeAction = parsed.actions.find(action => action.isInProgress)

    expect(parsed.myTeam[1].championId).toBe(222)
    expect(activeAction).toMatchObject({ type: 'pick', isAllyAction: true })
    expect(parsed.timeLeftMs).toBe(18000)
  })

  it('keeps enemy pick turn details', () => {
    const parsed = parseSession(loadFixture('champ-select-enemy-pick'))
    const activeAction = parsed.actions.find(action => action.isInProgress)

    expect(parsed.theirTeam[0].championId).toBe(157)
    expect(activeAction).toMatchObject({ type: 'pick', isAllyAction: false })
    expect(parsed.timeLeftMs).toBe(12000)
  })

  it('parses finalization without an active action', () => {
    const parsed = parseSession(loadFixture('champ-select-finalization'))

    expect(parsed.phase).toBe('FINALIZATION')
    expect(parsed.actions.some(action => action.isInProgress)).toBe(false)
    expect(parsed.timeLeftMs).toBe(0)
  })
})

describe('parseChampSelectMessage', () => {
  it('detects champion select end events for dodge or remake', () => {
    const parsed = parseChampSelectMessage(loadRawFixture('champ-select-dodge-delete-message'))

    expect(parsed.type).toBe('end')
  })
})
