// Fase 3 — Riot Data Dragon: parche, campeones, mapa ID→Key

import axios from 'axios'
import { DATA_DRAGON_BASE } from '@shared/constants'
import type { ChampionEntry } from '@shared/types'
import { cache, keys } from './cache'

const TIMEOUT = 10_000

/** Devuelve la versión completa más reciente ("16.7.1") */
export async function fetchLatestPatch(): Promise<string> {
  try {
    const { data } = await axios.get<string[]>(
      `${DATA_DRAGON_BASE}/api/versions.json`,
      { timeout: 5_000 }
    )
    return data[0] ?? '16.7.1'
  } catch {
    console.warn('[DataDragon] No se pudo obtener el parche, usando 16.7.1')
    return '16.7.1'
  }
}

/**
 * Devuelve la lista completa de campeones con id, key, name y tags.
 * Cachea por versión de parche (TTL implícito: hasta que cambie el parche).
 */
export async function fetchChampionList(patch: string): Promise<ChampionEntry[]> {
  const key = keys.champions(patch)
  const cached = cache.get<ChampionEntry[]>(key)
  if (cached) {
    console.log(`[DataDragon] Champions desde caché (${cached.length}) [${patch}]`)
    return cached
  }

  try {
    const { data } = await axios.get<{
      data: Record<string, { key: string; id: string; name: string; tags: string[] }>
    }>(
      `${DATA_DRAGON_BASE}/cdn/${patch}/data/en_US/champion.json`,
      { timeout: TIMEOUT }
    )

    const champions: ChampionEntry[] = Object.values(data.data).map(c => ({
      id:   parseInt(c.key, 10),
      key:  c.id,     // "Aatrox"  (usado en URLs de iconos)
      name: c.name,   // "Aatrox"  (nombre display)
      tags: c.tags
    }))

    cache.set(key, champions)
    console.log(`[DataDragon] ${champions.length} campeones cargados (parche ${patch})`)
    return champions
  } catch (err) {
    console.warn('[DataDragon] Error al cargar campeones:', (err as Error).message)
    return []
  }
}

/** Construye un mapa numéricId → key ("Aatrox") a partir de la lista de campeones */
export function buildIdMap(champions: ChampionEntry[]): Record<number, string> {
  const map: Record<number, string> = {}
  for (const c of champions) map[c.id] = c.key
  return map
}

/** URL pública del icono cuadrado de un campeón */
export function champIconUrl(champKey: string, patch: string): string {
  return `${DATA_DRAGON_BASE}/cdn/${patch}/img/champion/${champKey}.png`
}

/**
 * Descarga runesReforged.json y construye un mapa runeId → URL del icono.
 * Los iconos de runas no llevan versión de parche en la URL.
 */
export async function fetchRuneIconMap(patch: string): Promise<Record<number, string>> {
  const key = `rune-icons:${patch}`
  const cached = cache.get<Record<number, string>>(key)
  if (cached) return cached

  try {
    const { data } = await axios.get<RuneStyle[]>(
      `${DATA_DRAGON_BASE}/cdn/${patch}/data/en_US/runesReforged.json`,
      { timeout: TIMEOUT }
    )
    const map: Record<number, string> = {}
    for (const style of data) {
      map[style.id] = `${DATA_DRAGON_BASE}/cdn/img/${style.icon}`
      for (const slot of style.slots) {
        for (const rune of slot.runes) {
          map[rune.id] = `${DATA_DRAGON_BASE}/cdn/img/${rune.icon}`
        }
      }
    }
    cache.set(key, map)
    console.log(`[DataDragon] ${Object.keys(map).length} iconos de runas cargados`)
    return map
  } catch (err) {
    console.warn('[DataDragon] No se pudieron cargar iconos de runas:', (err as Error).message)
    return {}
  }
}

interface RuneStyle {
  id: number
  key: string
  icon: string
  name: string
  slots: { runes: { id: number; key: string; icon: string; name: string }[] }[]
}
