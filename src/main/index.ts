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
import { IPC } from '@shared/constants'
import { fetchLatestPatch, fetchChampionList, buildIdMap } from './data/datadragon'
import { fetchChampionBuild, toShortPatch } from './data/lolalytics'
import { cache } from './data/cache'
import type { Role } from '@shared/constants'

let currentPatch = '16.7.1'
let cachedChampionMap: Record<number, string> = {}

let mainWindow: BrowserWindow | null = null
let lcuConnected = false

const lcuClient = new LcuClient()
const lcuEvents = new LcuEvents()

let sessionPoller: ReturnType<typeof setInterval> | null = null

function setupLcu(): void {
  lcuClient.onConnect(async (credentials) => {
    lcuConnected = true
    lcuEvents.connect(credentials)

    mainWindow?.webContents.send(IPC.LCU_CONNECTED)

    const session = await lcuEvents.fetchCurrentSession()
    if (session) {
      mainWindow?.webContents.send(IPC.DRAFT_UPDATE, session)
    }

    if (sessionPoller) clearInterval(sessionPoller)
    sessionPoller = setInterval(async () => {
      if (!lcuConnected) return
      try {
        const s = await lcuEvents.fetchCurrentSession()
        mainWindow?.webContents.send(IPC.DRAFT_UPDATE, s ?? null)
      } catch { /* LCU no disponible temporalmente */ }
    }, 3000)
  })

  lcuClient.onDisconnect(() => {
    lcuConnected = false
    lcuEvents.disconnect()
    mainWindow?.webContents.send(IPC.LCU_DISCONNECTED)

    if (sessionPoller) {
      clearInterval(sessionPoller)
      sessionPoller = null
    }
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
    width: 940,
    height: 580,
    minWidth: 760,
    minHeight: 480,
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

// ─── IPC handlers ─────────────────────────────────────────────────────────────

ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:close',    () => mainWindow?.close())

ipcMain.handle('lcu:getStatus',  () => lcuConnected ? 'connected' : 'disconnected')
ipcMain.handle('champions:get',  () => cachedChampionMap)

// Renderer solicita build para un campeón/rol específico (Fase 5)
ipcMain.handle(IPC.GET_BUILD, async (_event, { champKey, role }: { champKey: string; role: Role }) => {
  return await fetchChampionBuild(champKey, role, currentPatch)
})

// ─── Protocolo ddragon:// ──────────────────────────────────────────────────────
// ddragon://{champName}  o  ddragon://{numericId}
// Proxea iconos de campeón desde Data Dragon con el parche actual.
// NOTA: con standard:true Chromium pone el hostname en minúsculas y añade barra final.

function setupDdragonProtocol(): void {
  protocol.handle('ddragon', async (request) => {
    const raw = request.url
      .slice('ddragon://'.length)
      .replace(/\/+$/g, '')
      .replace(/\.png$/i, '')

    const numId = parseInt(raw, 10)
    let champName: string | undefined

    if (!isNaN(numId)) {
      champName = cachedChampionMap[numId]
    } else {
      champName = Object.values(cachedChampionMap).find(
        n => n.toLowerCase() === raw.toLowerCase()
      )
    }
    if (!champName) return new Response(null, { status: 404 })

    const url = `https://ddragon.leagueoflegends.com/cdn/${currentPatch}/img/champion/${champName}.png`
    try {
      const { data, headers: h } = await axios.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Referer':    'https://www.leagueoflegends.com/'
        }
      })
      return new Response(data, {
        status: 200,
        headers: { 'Content-Type': String(h['content-type'] ?? 'image/png') }
      })
    } catch (err: unknown) {
      const e = err as { response?: { status: number }; message: string }
      console.warn(`[ddragon] ${e.response?.status ?? e.message}: ${url}`)
      return new Response(null, { status: 404 })
    }
  })
}

// ─── Init ─────────────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.draftapp.lol')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  setupDdragonProtocol()
  createWindow()
  setupLcu()

  // Parche actual → evict de caché obsoleta → lista de campeones
  currentPatch = await fetchLatestPatch()
  console.log('[Init] Parche:', currentPatch)

  cache.evictOldPatch(toShortPatch(currentPatch))

  const champions = await fetchChampionList(currentPatch)
  cachedChampionMap = buildIdMap(champions)

  mainWindow?.webContents.send(IPC.PATCH_UPDATE,    currentPatch)
  mainWindow?.webContents.send(IPC.CHAMPIONS_UPDATE, cachedChampionMap)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  lcuClient.stop()
  if (process.platform !== 'darwin') app.quit()
})
