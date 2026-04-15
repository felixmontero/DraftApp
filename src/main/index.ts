import { app, BrowserWindow, shell, ipcMain, protocol } from 'electron'
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
import { fetchLatestPatch, fetchChampionList, buildIdMap, fetchRuneIconMap } from './data/datadragon'
import { fetchChampionBuild, toShortPatch } from './data/lolalytics'
import { cache } from './data/cache'
import { computeRecommendations } from './engine/recommendations'
import type { DraftState } from '@shared/types'
import type { ChampionEntry } from '@shared/types'
import type { Role } from '@shared/constants'

// ─── Estado global ─────────────────────────────────────────────────────────────

let currentPatch = '16.7.1'
let cachedChampions: ChampionEntry[] = []
let cachedChampionMap: Record<number, string> = {}
let cachedRuneMap: Record<number, string> = {}   // runeId → iconUrl (HTTPS)

let mainWindow: BrowserWindow | null = null
let lcuConnected = false

const lcuClient = new LcuClient()
const lcuEvents = new LcuEvents()

let sessionPoller: ReturnType<typeof setInterval> | null = null

// ─── Recomendaciones ──────────────────────────────────────────────────────────

let computingRecs = false  // semáforo: evita cómputos solapados

async function updateRecommendations(draft: DraftState | null): Promise<void> {
  if (!draft || computingRecs) return
  computingRecs = true
  try {
    const recs = await computeRecommendations(draft, cachedChampions, cachedChampionMap, currentPatch)
    mainWindow?.webContents.send(IPC.RECOMMENDATIONS_UPDATE, recs)
  } catch (err) {
    console.warn('[Recs] Error calculando recomendaciones:', (err as Error).message)
  } finally {
    computingRecs = false
  }
}

// ─── Patch polling ────────────────────────────────────────────────────────────
// Comprueba si hay un parche nuevo cada 30 min; actualiza todo si hay cambio.

const PATCH_POLL_INTERVAL = 30 * 60 * 1000  // 30 min

async function checkForNewPatch(): Promise<void> {
  const latestPatch = await fetchLatestPatch()
  if (latestPatch === currentPatch) return

  console.log(`[Patch] Nuevo parche detectado: ${currentPatch} → ${latestPatch}`)
  currentPatch = latestPatch
  cache.evictOldPatch(toShortPatch(currentPatch))

  ;[cachedChampions, cachedRuneMap] = await Promise.all([
    fetchChampionList(currentPatch),
    fetchRuneIconMap(currentPatch)
  ])
  cachedChampionMap = buildIdMap(cachedChampions)

  mainWindow?.webContents.send(IPC.PATCH_UPDATE,    currentPatch)
  mainWindow?.webContents.send(IPC.CHAMPIONS_UPDATE, cachedChampionMap)
}

// ─── LCU ──────────────────────────────────────────────────────────────────────

function setupLcu(): void {
  lcuClient.onConnect(async (credentials) => {
    lcuConnected = true
    lcuEvents.connect(credentials)
    mainWindow?.webContents.send(IPC.LCU_CONNECTED)

    const session = await lcuEvents.fetchCurrentSession()
    if (session) {
      mainWindow?.webContents.send(IPC.DRAFT_UPDATE, session)
      updateRecommendations(session)
    }

    if (sessionPoller) clearInterval(sessionPoller)
    sessionPoller = setInterval(async () => {
      if (!lcuConnected) return
      try {
        const s = await lcuEvents.fetchCurrentSession()
        mainWindow?.webContents.send(IPC.DRAFT_UPDATE, s ?? null)
        updateRecommendations(s)
      } catch { /* LCU no disponible temporalmente */ }
    }, 3000)
  })

  lcuClient.onDisconnect(() => {
    lcuConnected = false
    lcuEvents.disconnect()
    mainWindow?.webContents.send(IPC.LCU_DISCONNECTED)
    mainWindow?.webContents.send(IPC.RECOMMENDATIONS_UPDATE, [])
    if (sessionPoller) { clearInterval(sessionPoller); sessionPoller = null }
  })

  lcuEvents.onDraftUpdate((state) => {
    mainWindow?.webContents.send(IPC.DRAFT_UPDATE, state)
    updateRecommendations(state)
  })

  lcuEvents.onDraftEnd(() => {
    mainWindow?.webContents.send(IPC.DRAFT_UPDATE, null)
    mainWindow?.webContents.send(IPC.RECOMMENDATIONS_UPDATE, [])
  })

  lcuClient.start()
}

// ─── Ventana principal ─────────────────────────────────────────────────────────

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

  mainWindow.on('ready-to-show', () => { mainWindow!.show() })

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

// ─── Protocolo ddragon:// ──────────────────────────────────────────────────────

async function fetchImage(url: string): Promise<Response> {
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
}

function setupDdragonProtocol(): void {
  protocol.handle('ddragon', async (request) => {
    const raw = request.url
      .slice('ddragon://'.length)
      .replace(/\/+$/g, '')
      .replace(/\.(png|webp)$/i, '')

    // ── Item: ddragon://item/1001 ────────────────────────────────────────────
    if (raw.startsWith('item/')) {
      const itemId = raw.slice(5)
      const url = `https://ddragon.leagueoflegends.com/cdn/${currentPatch}/img/item/${itemId}.png`
      return fetchImage(url)
    }

    // ── Rune: ddragon://rune/8112 ────────────────────────────────────────────
    if (raw.startsWith('rune/')) {
      const runeId = parseInt(raw.slice(5), 10)
      const iconUrl = cachedRuneMap[runeId]
      if (!iconUrl) return new Response(null, { status: 404 })
      return fetchImage(iconUrl)
    }

    // ── Champion: ddragon://266 or ddragon://Aatrox ──────────────────────────
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
    return fetchImage(url)
  })
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────

ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:close',    () => mainWindow?.close())

ipcMain.handle('lcu:getStatus',  () => lcuConnected ? 'connected' : 'disconnected')
ipcMain.handle('champions:get',  () => cachedChampionMap)

ipcMain.handle(IPC.GET_BUILD, async (_event, { champKey, role }: { champKey: string; role: Role }) => {
  return await fetchChampionBuild(champKey, role, currentPatch)
})

// ─── Init ─────────────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.draftapp.lol')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  setupDdragonProtocol()
  createWindow()
  setupLcu()

  // Parche → evict caché obsoleta → campeones + runas
  currentPatch      = await fetchLatestPatch()
  cache.evictOldPatch(toShortPatch(currentPatch))
  ;[cachedChampions, cachedRuneMap] = await Promise.all([
    fetchChampionList(currentPatch),
    fetchRuneIconMap(currentPatch)
  ])
  cachedChampionMap = buildIdMap(cachedChampions)
  console.log(`[Init] Parche: ${currentPatch} | Campeones: ${cachedChampions.length} | Runas: ${Object.keys(cachedRuneMap).length}`)

  mainWindow?.webContents.send(IPC.PATCH_UPDATE,    currentPatch)
  mainWindow?.webContents.send(IPC.CHAMPIONS_UPDATE, cachedChampionMap)

  // Polling de parche cada 30 min
  setInterval(checkForNewPatch, PATCH_POLL_INTERVAL)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  lcuClient.stop()
  if (process.platform !== 'darwin') app.quit()
})
