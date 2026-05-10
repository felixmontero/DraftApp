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
import { getSettings, updateOverlaySettings } from './data/settings'
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
let hadActiveDraft = false
let consecutiveEmptySessions = 0
let dataReady = false

// ─── Recomendaciones ──────────────────────────────────────────────────────────

let computingRecs = false  // semáforo: evita cómputos solapados
let lastRecsFingerprint = '' // fingerprint para evitar envíos redundantes

let latestDraftForRecs: DraftState | null = null
let pendingRecompute = false

function draftFingerprint(draft: DraftState | null): string {
  if (!draft) return 'none'
  const champs = [...draft.myTeam, ...draft.theirTeam]
    .map(p => `${p.cellId}:${p.assignedPosition}:${p.championId}`)
    .join('|')
  const actions = draft.actions
    .map(a => `${a.id}:${a.type}:${a.championId}:${a.completed}:${a.isInProgress}`)
    .join('|')
  return `${draft.localPlayerCellId}:${draft.phase}:${champs}:${actions}`
}

function clearRecommendations(): void {
  latestDraftForRecs = null
  pendingRecompute = false
  lastRecsFingerprint = ''
  mainWindow?.webContents.send(IPC.RECOMMENDATIONS_UPDATE, [])
}

function emitDraftEnd(): void {
  if (!hadActiveDraft) return
  hadActiveDraft = false
  consecutiveEmptySessions = 0
  mainWindow?.webContents.send(IPC.DRAFT_UPDATE, null)
  clearRecommendations()
}

async function updateRecommendations(draft: DraftState | null): Promise<void> {
  latestDraftForRecs = draft

  if (!draft) {
    clearRecommendations()
    return
  }

  if (!dataReady || cachedChampions.length === 0) {
    pendingRecompute = true
    return
  }

  if (computingRecs) {
    pendingRecompute = true
    return
  }

  computingRecs = true
  try {
    do {
      pendingRecompute = false
      const currentDraft = latestDraftForRecs
      if (!currentDraft) break

      const currentDraftFingerprint = draftFingerprint(currentDraft)
      const recs = await computeRecommendations(currentDraft, cachedChampions, cachedChampionMap, currentPatch)

      if (currentDraftFingerprint !== draftFingerprint(latestDraftForRecs)) {
        pendingRecompute = true
        continue
      }

      const fingerprint = recs.map(r => `${r.champion.key}:${Math.round(r.score)}`).join(',')
      if (fingerprint !== lastRecsFingerprint) {
        lastRecsFingerprint = fingerprint
        mainWindow?.webContents.send(IPC.RECOMMENDATIONS_UPDATE, recs)
      }
    } while (pendingRecompute)
  } catch (err) {
    console.warn('[Recs] Error calculando recomendaciones:', (err as Error).message)
  } finally {
    computingRecs = false
  }

  if (pendingRecompute && latestDraftForRecs) {
    void updateRecommendations(latestDraftForRecs)
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
  dataReady = false
  cache.evictOldPatch(toShortPatch(currentPatch))

  ;[cachedChampions, cachedRuneMap] = await Promise.all([
    fetchChampionList(currentPatch),
    fetchRuneIconMap(currentPatch)
  ])
  cachedChampionMap = buildIdMap(cachedChampions)
  dataReady = true

  mainWindow?.webContents.send(IPC.PATCH_UPDATE,    currentPatch)
  mainWindow?.webContents.send(IPC.CHAMPIONS_UPDATE, cachedChampionMap)
  if (latestDraftForRecs) void updateRecommendations(latestDraftForRecs)
}

// ─── LCU ──────────────────────────────────────────────────────────────────────

function emitDraftUpdate(state: DraftState): void {
  hadActiveDraft = true
  consecutiveEmptySessions = 0
  mainWindow?.webContents.send(IPC.DRAFT_UPDATE, state)
  void updateRecommendations(state)
}

function setupLcu(): void {
  lcuClient.onConnect(async (credentials) => {
    lcuConnected = true
    lcuEvents.connect(credentials)
    mainWindow?.webContents.send(IPC.LCU_CONNECTED)

    const session = await lcuEvents.fetchCurrentSession()
    if (session) {
      emitDraftUpdate(session)
    }

    if (sessionPoller) clearInterval(sessionPoller)
    sessionPoller = setInterval(async () => {
      if (!lcuConnected) return
      try {
        const s = await lcuEvents.fetchCurrentSession()
        // Solo enviar si hay sesión activa — el WebSocket se encarga de enviar null cuando termina
        if (s) {
          emitDraftUpdate(s)
        } else if (hadActiveDraft) {
          consecutiveEmptySessions += 1
          if (consecutiveEmptySessions >= 2) emitDraftEnd()
        }
      } catch { /* LCU no disponible temporalmente */ }
    }, 3000)
  })

  lcuClient.onDisconnect(() => {
    lcuConnected = false
    lcuEvents.disconnect()
    mainWindow?.webContents.send(IPC.LCU_DISCONNECTED)
    hadActiveDraft = false
    consecutiveEmptySessions = 0
    clearRecommendations()
    if (sessionPoller) { clearInterval(sessionPoller); sessionPoller = null }
  })

  lcuEvents.onDraftUpdate((state) => {
    emitDraftUpdate(state)
  })

  lcuEvents.onDraftEnd(() => {
    emitDraftEnd()
  })

  lcuClient.start()
}

// ─── Ventana principal ─────────────────────────────────────────────────────────

function createWindow(): void {
  const settings = getSettings()
  const bounds = settings.overlay.windowBounds
  mainWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    minWidth: 360,
    minHeight: 420,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: settings.overlay.alwaysOnTop,
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

  let saveBoundsTimer: ReturnType<typeof setTimeout> | null = null
  const scheduleBoundsSave = (): void => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    if (saveBoundsTimer) clearTimeout(saveBoundsTimer)
    saveBoundsTimer = setTimeout(() => {
      if (!mainWindow || mainWindow.isDestroyed()) return
      updateOverlaySettings({ windowBounds: mainWindow.getBounds() })
    }, 350)
  }

  mainWindow.on('move', scheduleBoundsSave)
  mainWindow.on('resize', scheduleBoundsSave)
  mainWindow.on('close', () => {
    if (saveBoundsTimer) clearTimeout(saveBoundsTimer)
    if (mainWindow && !mainWindow.isDestroyed()) {
      updateOverlaySettings({ windowBounds: mainWindow.getBounds() })
    }
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

ipcMain.handle(IPC.WINDOW_MINIMIZE, () => mainWindow?.minimize())
ipcMain.handle(IPC.WINDOW_CLOSE,    () => mainWindow?.close())
ipcMain.handle(IPC.WINDOW_RESET_BOUNDS, () => {
  const windowBounds = { width: 940, height: 580 }
  mainWindow?.setBounds(windowBounds)
  return updateOverlaySettings({ windowBounds })
})

ipcMain.handle(IPC.LCU_GET_STATUS,  () => lcuConnected ? 'connected' : 'disconnected')
ipcMain.handle(IPC.CHAMPIONS_GET,  () => cachedChampionMap)
ipcMain.handle(IPC.APP_GET_SETTINGS, () => getSettings())
ipcMain.handle(IPC.APP_SET_OVERLAY_SETTINGS, (_event, settings: unknown) => {
  const updated = updateOverlaySettings(settings as Parameters<typeof updateOverlaySettings>[0])
  mainWindow?.setAlwaysOnTop(updated.overlay.alwaysOnTop)
  return updated
})
ipcMain.handle(IPC.APP_GET_SNAPSHOT, () => ({
  connection: lcuConnected ? 'connected' : 'disconnected',
  patch: currentPatch,
  champions: cachedChampionMap
}))

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

  // Parche → evict caché obsoleta → campeones + runas
  currentPatch      = await fetchLatestPatch()
  cache.evictOldPatch(toShortPatch(currentPatch))
  cache.clearBuildsAndStats()  // Invalidar builds/stats cacheados con datos viejos del scraper
  ;[cachedChampions, cachedRuneMap] = await Promise.all([
    fetchChampionList(currentPatch),
    fetchRuneIconMap(currentPatch)
  ])
  cachedChampionMap = buildIdMap(cachedChampions)
  dataReady = true
  console.log(`[Init] Parche: ${currentPatch} | Campeones: ${cachedChampions.length} | Runas: ${Object.keys(cachedRuneMap).length}`)

  mainWindow?.webContents.send(IPC.PATCH_UPDATE,    currentPatch)
  mainWindow?.webContents.send(IPC.CHAMPIONS_UPDATE, cachedChampionMap)
  setupLcu()

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
