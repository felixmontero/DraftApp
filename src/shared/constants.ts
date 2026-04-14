// Versión de parche actual — se actualizará automáticamente en Fase 3
export const CURRENT_PATCH = '14.13'

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
  // Renderer → Main
  GET_RECOMMENDATIONS: 'recommendations:get',
  GET_BUILD: 'build:get'
} as const

// Roles de LoL
export const ROLES = ['top', 'jungle', 'middle', 'bottom', 'utility'] as const
export type Role = typeof ROLES[number]
