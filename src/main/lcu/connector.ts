import { EventEmitter } from 'events'
import { exec } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import type { LcuCredentials } from './types'

// ─── LCU Path detection ────────────────────────────────────────────────────────

// Windows 11 24H2+ eliminó WMIC. Usamos Get-CimInstance via PowerShell.
function getLcuPathFromProcess(): Promise<string | null> {
  return new Promise((resolve) => {
    // PowerShell: Get-CimInstance reemplaza WMIC en Windows 11 moderno
    const ps = `powershell -NoProfile -NonInteractive -Command "(Get-CimInstance Win32_Process -Filter \\"name='LeagueClientUx.exe'\\").CommandLine"`
    exec(ps, (err, stdout) => {
      if (!err && stdout) {
        const match = stdout.match(/"--install-directory=(.*?)"/)
        if (match?.[1]) {
          resolve(match[1].trim())
          return
        }
      }

      // Fallback: WMIC (Windows 10 / versiones antiguas)
      exec(`WMIC PROCESS WHERE "name='LeagueClientUx.exe'" GET commandline`, (err2, stdout2) => {
        if (!err2 && stdout2) {
          const match2 = stdout2.match(/"--install-directory=(.*?)"/)
          if (match2?.[1]) {
            resolve(match2[1].trim())
            return
          }
        }
        resolve(null)
      })
    })
  })
}

function isValidLcuPath(dirPath: string | null): boolean {
  if (!dirPath) return false
  try {
    return (
      fs.existsSync(path.join(dirPath, 'LeagueClient.exe')) &&
      fs.existsSync(path.join(dirPath, 'Config'))
    )
  } catch {
    return false
  }
}

function parseLockfile(content: string): LcuCredentials | null {
  // Formato: nombre:pid:puerto:password:protocolo
  const parts = content.trim().split(':')
  if (parts.length < 5) return null
  return {
    protocol: parts[4],
    address: '127.0.0.1',
    port: parseInt(parts[2], 10),
    username: 'riot',
    password: parts[3]
  }
}

// ─── LcuClient ─────────────────────────────────────────────────────────────────

type ConnectCb = (credentials: LcuCredentials) => void
type DisconnectCb = () => void

export class LcuClient extends EventEmitter {
  private connectCb: ConnectCb | null = null
  private disconnectCb: DisconnectCb | null = null

  private processTimer: ReturnType<typeof setInterval> | null = null
  private lockfileWatcher: fs.FSWatcher | null = null
  private dirPath: string | null = null
  private connected = false

  onConnect(cb: ConnectCb): void { this.connectCb = cb }
  onDisconnect(cb: DisconnectCb): void { this.disconnectCb = cb }

  start(): void {
    this.pollProcess()
  }

  stop(): void {
    this.clearProcessTimer()
    this.clearLockfileWatcher()
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private async pollProcess(): Promise<void> {
    const lcuPath = await getLcuPathFromProcess()

    if (isValidLcuPath(lcuPath)) {
      console.log('[LCU] Proceso detectado en:', lcuPath)
      this.dirPath = lcuPath!
      this.clearProcessTimer()
      this.watchLockfile()
      return
    }

    // Reintentar cada segundo hasta que el cliente abra
    if (!this.processTimer) {
      this.processTimer = setInterval(() => this.pollProcess(), 1000)
    }
  }

  private clearProcessTimer(): void {
    if (this.processTimer) {
      clearInterval(this.processTimer)
      this.processTimer = null
    }
  }

  private watchLockfile(): void {
    if (this.lockfileWatcher || !this.dirPath) return

    const lockfilePath = path.join(this.dirPath, 'lockfile')

    // Leer inmediatamente si ya existe (cliente ya abierto al arrancar la app)
    if (fs.existsSync(lockfilePath)) {
      this.onLockfileCreated(lockfilePath)
    }

    this.lockfileWatcher = fs.watch(this.dirPath, (event, filename) => {
      if (filename !== 'lockfile') return
      if (event === 'rename') {
        if (fs.existsSync(lockfilePath)) {
          this.onLockfileCreated(lockfilePath)
        } else {
          this.onLockfileRemoved()
        }
      }
    })

    this.lockfileWatcher.on('error', (err) => {
      console.error('[LCU] Error vigilando directorio:', err.message)
      this.clearLockfileWatcher()
      // Relanzar la búsqueda del proceso
      this.pollProcess()
    })
  }

  private clearLockfileWatcher(): void {
    if (this.lockfileWatcher) {
      this.lockfileWatcher.close()
      this.lockfileWatcher = null
    }
  }

  private onLockfileCreated(lockfilePath: string): void {
    try {
      const content = fs.readFileSync(lockfilePath, 'utf-8')
      const credentials = parseLockfile(content)
      if (!credentials) return
      console.log('[LCU] Cliente detectado en puerto', credentials.port)
      this.connected = true
      this.connectCb?.(credentials)
    } catch (err) {
      console.error('[LCU] No se pudo leer el lockfile:', err)
    }
  }

  private onLockfileRemoved(): void {
    if (!this.connected) return
    console.log('[LCU] Cliente cerrado')
    this.connected = false
    this.disconnectCb?.()
    // Volver a buscar el proceso por si el usuario reabre el cliente
    this.clearLockfileWatcher()
    this.pollProcess()
  }
}
