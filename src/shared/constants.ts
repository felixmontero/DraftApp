// Versión de parche — se sobreescribe en runtime con el parche real de Data Dragon
export const CURRENT_PATCH = '16.7'

/**
 * Convierte la versión interna de Data Dragon a la que muestra el juego.
 * Riot usa naming año-based en la UI: DD 16.7 → juego 26.7
 * Fórmula: major + 10 → año display (16 + 10 = 26)
 */
export function ddPatchToDisplay(ddPatch: string): string {
  const parts = ddPatch.split('.')
  const major = parseInt(parts[0], 10)
  const minor = parts[1] ?? '0'
  return `${major + 10}.${minor}`
}

// URLs base
export const DATA_DRAGON_BASE = 'https://ddragon.leagueoflegends.com'
export const LOLALYTICS_BASE = 'https://lolalytics.com'

// Cache TTL: ~2 semanas en ms
export const CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000

// IPC channels
export const IPC = {
  // Main → Renderer
  LCU_CONNECTED: 'lcu:connected',
  LCU_DISCONNECTED: 'lcu:disconnected',
  DRAFT_UPDATE: 'draft:update',
  RECOMMENDATIONS_UPDATE: 'recommendations:update',
  PATCH_UPDATE: 'patch:update',
  // Renderer → Main
  GET_RECOMMENDATIONS: 'recommendations:get',
  GET_BUILD: 'build:get'
} as const

// Roles de LoL
export const ROLES = ['top', 'jungle', 'middle', 'bottom', 'utility'] as const
export type Role = typeof ROLES[number]
