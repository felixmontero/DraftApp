import { app, BrowserWindow, shell, ipcMain, protocol, net } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

// Debe llamarse ANTES de app.whenReady()
protocol.registerSchemesAsPrivileged([
  { scheme: 'ddragon', privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true } }
])
import axios from 'axios'
import { LcuClient } from './lcu/connector'
import { LcuEvents } from './lcu/events'
import { IPC, DATA_DRAGON_BASE } from '@shared/constants'

let currentPatch = '16.7'

async function fetchCurrentPatch(): Promise<string> {
  try {
    const { data } = await axios.get<string[]>(`${DATA_DRAGON_BASE}/api/versions.json`, { timeout: 5000 })
    const full = data[0] // "16.7.1"
    return full
  } catch {
    console.warn('[Patch] No se pudo obtener el parche actual, usando', currentPatch)
    return currentPatch
  }
}

async function fetchChampionMap(patch: string): Promise<Record<number, string>> {
  try {
    const { data } = await axios.get<{ data: Record<string, { key: string; id: string }> }>(
      `${DATA_DRAGON_BASE}/cdn/${patch}/data/en_US/champion.json`,
      { timeout: 10000 }
    )
    const map: Record<number, string> = {}
    for (const champ of Object.values(data.data)) {
      map[parseInt(champ.key)] = champ.id
    }
    console.log(`[Champions] Mapa cargado: ${Object.keys(map).length} campeones (parche ${patch})`)
    return map
  } catch (err) {
    console.warn('[Champions] No se pudo cargar el mapa de campeones:', err)
    return {}
  }
}

let mainWindow: BrowserWindow | null = null
let lcuConnected = false

const lcuClient = new LcuClient()
const lcuEvents = new LcuEvents()

function setupLcu(): void {
  lcuClient.onConnect(async (credentials) => {
    lcuConnected = true
    lcuEvents.connect(credentials)

    // Notificar al renderer que el cliente está conectado
    mainWindow?.webContents.send(IPC.LCU_CONNECTED)

    // Comprobar si ya hay una sesión de draft activa
    const session = await lcuEvents.fetchCurrentSession()
    if (session) {
      mainWindow?.webContents.send(IPC.DRAFT_UPDATE, session)
    }
  })

  lcuClient.onDisconnect(() => {
    lcuConnected = false
    lcuEvents.disconnect()
    mainWindow?.webContents.send(IPC.LCU_DISCONNECTED)
  })

  lcuEvents.onDraftUpdate((state) => {
    mainWindow?.webContents.send(IPC.DRAFT_UPDATE, state)
  })

  lcuEvents.onDraftEnd(() => {
    mainWindow?.webContents.send(IPC.DRAFT_UPDATE, null)
  })

  lcuClient.start()
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 780,
    minWidth: 360,
    minHeight: 600,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Controles de ventana
ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:close', () => mainWindow?.close())

// Estado LCU: el renderer lo consulta al montar para evitar la race condition
ipcMain.handle('lcu:getStatus', () => lcuConnected ? 'connected' : 'disconnected')

// Mapa de campeones: pull model para evitar race condition
let cachedChampionMap: Record<number, string> = {}
ipcMain.handle('champions:get', () => cachedChampionMap)

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.draftapp.lol')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Protocolo custom: sirve iconos de campeón proxeados por el proceso principal
  // ddragon://{championId} → Data Dragon CDN
  protocol.handle('ddragon', async (request) => {
    const champId = request.url.slice('ddragon://'.length) // e.g. "103"
    // Intentar varias CDNs hasta que una funcione
    const urls = [
      `https://ddragon.leagueoflegends.com/cdn/${currentPatch}/img/champion/${cachedChampionMap[parseInt(champId)]}.png`,
      `https://raw.communitydragon.org/${currentPatch.split('.').slice(0,2).join('.')}/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${champId}.png`,
      `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${champId}.png`,
    ]
    for (const url of urls) {
      try {
        const { data, headers: h } = await axios.get<ArrayBuffer>(url, {
          responseType: 'arraybuffer',
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Referer': 'https://www.leagueoflegends.com/'
          }
        })
        console.log('[ddragon] OK:', url)
        return new Response(data, { status: 200, headers: { 'Content-Type': String(h['content-type'] ?? 'image/png') } })
      } catch (err: any) {
        console.warn(`[ddragon] ${err.response?.status ?? err.message}: ${url}`)
      }
    }
    return new Response(null, { status: 404 })
  })

  createWindow()
  setupLcu()

  // Obtener parche y mapa de campeones, enviarlos al renderer
  currentPatch = await fetchCurrentPatch()
  console.log('[Patch] Parche actual:', currentPatch)
  mainWindow?.webContents.send(IPC.PATCH_UPDATE, currentPatch)

  cachedChampionMap = await fetchChampionMap(currentPatch)
  mainWindow?.webContents.send(IPC.CHAMPIONS_UPDATE, cachedChampionMap)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  lcuClient.stop()
  if (process.platform !== 'darwin') app.quit()
})
