// Tipos internos de la LCU API (Fase 2)

export interface LcuDraftPlayer {
  cellId: number
  championId: number
  assignedPosition: string
  summonerId: number
}

export interface LcuDraftAction {
  id: number
  type: 'ban' | 'pick'
  championId: number
  completed: boolean
  isAllyAction: boolean
  isInProgress: boolean
}

export interface LcuSession {
  localPlayerCellId: number
  myTeam: LcuDraftPlayer[]
  theirTeam: LcuDraftPlayer[]
  actions: LcuDraftAction[][]
  timer: {
    adjustedTimeLeftInPhase: number
    phase: 'PLANNING' | 'BAN_PICK' | 'FINALIZATION'
  }
}

export interface LcuCredentials {
  address: string
  port: number
  username: string
  password: string
  protocol: string
}
