import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import axios from 'axios'
import { LcuClient } from './lcu/connector'
import { LcuEvents } from './lcu/events'
import { IPC, DATA_DRAGON_BASE } from '@shared/constants'

let currentPatch = '16.7'

async function fetchCurrentPatch(): Promise<string> {
  try {
    const { data } = await axios.get<string[]>(`${DATA_DRAGON_BASE}/api/versions.json`, { timeout: 5000 })
    // versions.json devuelve array ordenado de más nuevo a más viejo, ej: ["16.7.1", "16.6.1", ...]
    // Usamos el major.minor (sin el .1 final) para URLs de iconos
    const full = data[0] // "16.7.1"
    return full          // guardamos la versión completa para URLs de Data Dragon
  } catch {
    console.warn('[Patch] No se pudo obtener el parche actual, usando', currentPatch)
    return currentPatch
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

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.draftapp.lol')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()
  setupLcu()

  // Obtener parche actual y enviarlo al renderer cuando esté listo
  currentPatch = await fetchCurrentPatch()
  console.log('[Patch] Parche actual:', currentPatch)
  mainWindow?.webContents.send(IPC.PATCH_UPDATE, currentPatch)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  lcuClient.stop()
  if (process.platform !== 'darwin') app.quit()
})
