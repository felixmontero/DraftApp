// Version de parche: se sobreescribe en runtime con el parche real de Data Dragon.
export const CURRENT_PATCH = '16.7'

/**
 * Convierte la version interna de Data Dragon a la que muestra el juego.
 * Riot usa naming year-based en la UI: DD 16.7 -> juego 26.7.
 */
export function ddPatchToDisplay(ddPatch: string): string {
  const parts = ddPatch.split('.')
  const major = parseInt(parts[0], 10)
  const minor = parts[1] ?? '0'
  return `${major + 10}.${minor}`
}

export const DATA_DRAGON_BASE = 'https://ddragon.leagueoflegends.com'
export const LOLALYTICS_BASE = 'https://lolalytics.com'

// Cache TTL: ~2 semanas en ms.
export const CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000

export const IPC = {
  // Main -> Renderer
  LCU_CONNECTED: 'lcu:connected',
  LCU_DISCONNECTED: 'lcu:disconnected',
  DRAFT_UPDATE: 'draft:update',
  RECOMMENDATIONS_UPDATE: 'recommendations:update',
  PATCH_UPDATE: 'patch:update',
  CHAMPIONS_UPDATE: 'champions:update',

  // Renderer -> Main
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_RESET_BOUNDS: 'window:resetBounds',
  LCU_GET_STATUS: 'lcu:getStatus',
  CHAMPIONS_GET: 'champions:get',
  APP_GET_SNAPSHOT: 'app:getSnapshot',
  APP_GET_SETTINGS: 'app:getSettings',
  APP_SET_OVERLAY_SETTINGS: 'app:setOverlaySettings',
  GET_RECOMMENDATIONS: 'recommendations:get',
  GET_BUILD: 'build:get'
} as const

export const IPC_LISTEN_CHANNELS = [
  IPC.LCU_CONNECTED,
  IPC.LCU_DISCONNECTED,
  IPC.DRAFT_UPDATE,
  IPC.RECOMMENDATIONS_UPDATE,
  IPC.PATCH_UPDATE,
  IPC.CHAMPIONS_UPDATE
] as const

export const IPC_INVOKE_CHANNELS = [
  IPC.WINDOW_MINIMIZE,
  IPC.WINDOW_CLOSE,
  IPC.WINDOW_RESET_BOUNDS,
  IPC.LCU_GET_STATUS,
  IPC.CHAMPIONS_GET,
  IPC.APP_GET_SNAPSHOT,
  IPC.APP_GET_SETTINGS,
  IPC.APP_SET_OVERLAY_SETTINGS,
  IPC.GET_RECOMMENDATIONS,
  IPC.GET_BUILD
] as const

export const ROLES = ['top', 'jungle', 'middle', 'bottom', 'utility'] as const
export type Role = typeof ROLES[number]
