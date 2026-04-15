// Fase 3 — Caché local con electron-store
// Estrategia: claves con patch embebido → eviction automática al cambiar parche

import Store from 'electron-store'

const store = new Store({ name: 'draftapp-cache' })

export const cache = {
  get<T>(key: string): T | null {
    const val = store.get(key, null)
    return val != null ? (val as T) : null
  },

  set(key: string, value: unknown): void {
    store.set(key, value)
  },

  /** Elimina todas las entradas cuya clave no termine en `:${currentPatch}` */
  evictOldPatch(currentPatch: string): void {
    const all = store.store as Record<string, unknown>
    let evicted = 0
    for (const key of Object.keys(all)) {
      if (key.includes(':') && !key.endsWith(`:${currentPatch}`)) {
        store.delete(key)
        evicted++
      }
    }
    if (evicted > 0) console.log(`[Cache] Evicted ${evicted} entries de parche anterior`)
  },

  /** Elimina todas las entradas de builds y stats (para invalidar tras cambios en el scraper) */
  clearBuildsAndStats(): void {
    const all = store.store as Record<string, unknown>
    let cleared = 0
    for (const key of Object.keys(all)) {
      if (key.startsWith('stats:') || key.startsWith('build:')) {
        store.delete(key)
        cleared++
      }
    }
    if (cleared > 0) console.log(`[Cache] Cleared ${cleared} build/stats entries`)
  }
}

// Helpers de clave — garantizan consistencia entre módulos
export const keys = {
  champions: (patch: string) => `champions:${patch}`,
  stats:     (champKey: string, role: string, patch: string) => `stats:${champKey}:${role}:${patch}`,
  build:     (champKey: string, role: string, patch: string) => `build:${champKey}:${role}:${patch}`
}
