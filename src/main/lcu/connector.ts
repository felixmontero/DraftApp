import LCUConnector from 'lcu-connector'
import type { LcuCredentials } from './types'

type ConnectCb = (credentials: LcuCredentials) => void
type DisconnectCb = () => void

export class LcuClient {
  private connector: InstanceType<typeof LCUConnector>
  private connectCb: ConnectCb | null = null
  private disconnectCb: DisconnectCb | null = null

  constructor() {
    this.connector = new LCUConnector()

    this.connector.on('connect', (data: LcuCredentials) => {
      console.log('[LCU] Cliente detectado en puerto', data.port)
      this.connectCb?.(data)
    })

    this.connector.on('disconnect', () => {
      console.log('[LCU] Cliente cerrado')
      this.disconnectCb?.()
    })
  }

  onConnect(cb: ConnectCb): void { this.connectCb = cb }
  onDisconnect(cb: DisconnectCb): void { this.disconnectCb = cb }

  start(): void { this.connector.start() }
  stop(): void { this.connector.stop() }
}
