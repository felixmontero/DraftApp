import WebSocket from 'ws'
import https from 'https'
import axios from 'axios'
import type { LcuCredentials, LcuSession } from './types'
import type { DraftState, DraftPlayer, DraftAction } from '@shared/types'
import type { Role } from '@shared/constants'

// Agente HTTPS que ignora el certificado autofirmado del cliente LoL
const lcuAgent = new https.Agent({ rejectUnauthorized: false })

// Número de evento WAMP para suscribirse
const WAMP_SUBSCRIBE = 5
const CHAMP_SELECT_EVENT = 'OnJsonApiEvent_lol-champ-select_v1_session'

type DraftUpdateCb = (state: DraftState) => void
type DraftEndCb = () => void

export class LcuEvents {
  private ws: WebSocket | null = null
  private credentials: LcuCredentials | null = null
  private retryTimeout: ReturnType<typeof setTimeout> | null = null
  private draftUpdateCb: DraftUpdateCb | null = null
  private draftEndCb: DraftEndCb | null = null

  onDraftUpdate(cb: DraftUpdateCb): void { this.draftUpdateCb = cb }
  onDraftEnd(cb: DraftEndCb): void { this.draftEndCb = cb }

  connect(credentials: LcuCredentials): void {
    this.credentials = credentials
    this.openWebSocket()
  }

  disconnect(): void {
    // Cancelar reintento pendiente para que no dispare openWebSocket después
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
      this.retryTimeout = null
    }
    if (this.ws) {
      this.ws.removeAllListeners()
      this.ws.close()
      this.ws = null
    }
    this.credentials = null
  }

  // Obtiene el estado actual del draft via REST (por si ya hay una sesión activa)
  async fetchCurrentSession(): Promise<DraftState | null> {
    if (!this.credentials) return null
    try {
      const { address, port, username, password, protocol } = this.credentials
      const response = await axios.get<LcuSession>(
        `${protocol}://${address}:${port}/lol-champ-select/v1/session`,
        {
          auth: { username, password },
          httpsAgent: lcuAgent
        }
      )
      return parseSession(response.data)
    } catch {
      // 404 = no hay sesión activa, es normal
      return null
    }
  }

  private openWebSocket(): void {
    if (!this.credentials) return

    // Cancelar cualquier reintento pendiente del WebSocket anterior
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
      this.retryTimeout = null
    }

    // Cerrar WebSocket anterior para evitar conexiones duplicadas
    if (this.ws) {
      this.ws.removeAllListeners()
      this.ws.close()
      this.ws = null
    }

    const { address, port, username, password } = this.credentials

    const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')

    this.ws = new WebSocket(`wss://${address}:${port}`, {
      headers: { Authorization: authHeader },
      rejectUnauthorized: false
    })

    this.ws.on('open', () => {
      console.log('[LCU] WebSocket conectado')
      // Suscripción optimista (puede fallar si WELCOME no ha llegado aún)
      this.ws?.send(JSON.stringify([WAMP_SUBSCRIBE, CHAMP_SELECT_EVENT]))
    })

    this.ws.on('message', (data: WebSocket.RawData) => {
      const raw = data.toString()
      try {
        const msg = JSON.parse(raw)
        // WAMP WELCOME (tipo 0): el servidor está listo para aceptar suscripciones
        if (Array.isArray(msg) && msg[0] === 0) {
          console.log('[LCU] WAMP sesión iniciada, suscribiendo eventos...')
          this.ws?.send(JSON.stringify([WAMP_SUBSCRIBE, CHAMP_SELECT_EVENT]))
        }
      } catch { /* ignorar mensajes no-JSON */ }
      this.handleMessage(raw)
    })

    this.ws.on('error', (err) => {
      console.error('[LCU] WebSocket error:', err.message)
    })

    this.ws.on('close', () => {
      console.log('[LCU] WebSocket cerrado')
      // Reintentar conexión si aún tenemos credenciales
      if (this.credentials) {
        this.retryTimeout = setTimeout(() => {
          this.retryTimeout = null
          if (this.credentials) {
            console.log('[LCU] Reintentando WebSocket...')
            this.openWebSocket()
          }
        }, 2000)
      }
    })
  }

  private handleMessage(raw: string): void {
    if (!raw || raw.length === 0) return

    let msg: unknown
    try {
      msg = JSON.parse(raw)
    } catch {
      return
    }

    // Formato WAMP: [tipo, evento, datos]
    if (!Array.isArray(msg) || msg[0] !== 8) return

    const eventName = msg[1] as string
    if (!eventName.includes('lol-champ-select')) return

    const payload = msg[2] as { data: LcuSession | null; eventType: string }

    if (!payload?.data || payload.eventType === 'Delete') {
      this.draftEndCb?.()
      return
    }

    const draftState = parseSession(payload.data)
    this.draftUpdateCb?.(draftState)
  }
}

// ─── Parser: LcuSession → DraftState ─────────────────────────────────────────

function parseSession(session: LcuSession): DraftState {
  const actions = session.actions?.flat() ?? []

  return {
    localPlayerCellId: session.localPlayerCellId,
    myTeam: (session.myTeam ?? []).map(parsePlayer),
    theirTeam: (session.theirTeam ?? []).map(parsePlayer),
    actions: actions.map(parseAction),
    phase: session.timer?.phase ?? 'NONE',
    timeLeftMs: session.timer?.adjustedTimeLeftInPhase ?? 0
  }
}

function parsePlayer(p: LcuSession['myTeam'][0]): DraftPlayer {
  return {
    cellId: p.cellId,
    championId: p.championId,
    assignedPosition: normalizeRole(p.assignedPosition),
    summonerId: p.summonerId
  }
}

function parseAction(a: LcuSession['actions'][0][0]): DraftAction {
  return {
    id: a.id,
    type: a.type,
    championId: a.championId,
    completed: a.completed,
    isAllyAction: a.isAllyAction,
    isInProgress: a.isInProgress
  }
}

function normalizeRole(pos: string): Role | '' {
  const map: Record<string, Role> = {
    top: 'top',
    jungle: 'jungle',
    middle: 'middle',
    bottom: 'bottom',
    utility: 'utility',
    support: 'utility'
  }
  return map[pos?.toLowerCase()] ?? ''
}
