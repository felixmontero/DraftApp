// Análisis de composición de equipo
// Usa tipo de daño real (AD/AP) en lugar de solo tags de DataDragon,
// porque tags como "Assassin" o "Fighter" no indican si el daño es físico o mágico.

import type { ChampionEntry } from '@shared/types'
import { normalizeChampionKey, sameChampionKey } from '@shared/championKeys'

// ─── Mapa de tipo de daño por campeón ────────────────────────────────────────
// 'AD'  = daño principalmente físico
// 'AP'  = daño principalmente mágico
// 'MIX' = daño mixto relevante (e.g. Corki, Kai'Sa)
// Campeones no listados → inferido de tags (Mage→AP, resto→AD)

type DmgType = 'AD' | 'AP' | 'MIX'

const DAMAGE_TYPE: Record<string, DmgType> = {
  // AP Assassins (no tienen tag Mage)
  Akali: 'AP', Diana: 'AP', Ekko: 'AP', Fizz: 'AP', Katarina: 'AP',
  LeBlanc: 'AP', Sylas: 'AP', Vex: 'AP', Zoe: 'AP', Neeko: 'AP',
  Kassadin: 'AP', Evelynn: 'AP', Elise: 'AP', Nidalee: 'AP',

  // AP Supports sin tag Mage puro
  Morgana: 'AP', Lux: 'AP', Senna: 'MIX', Seraphine: 'AP',
  Zilean: 'AP', Soraka: 'AP', Nami: 'AP', Janna: 'AP',

  // AD Assassins (tienen tag Assassin pero daño físico)
  Zed: 'AD', Talon: 'AD', Kha: 'AD', Rengar: 'AD', Nocturne: 'AD',
  Qiyana: 'AD', Naafiri: 'AD', Shaco: 'AD', Pyke: 'AD',

  // Mixtos relevantes
  Corki: 'MIX', Kaisa: 'MIX', Ezreal: 'MIX', Jayce: 'MIX',
  Smolder: 'MIX', Jhin: 'AD',  // Jhin es tag Marksman, AD puro

  // AP Junglers sin tag Mage
  Amumu: 'AP', Fiddlesticks: 'AP', Lillia: 'AP', Karthus: 'AP',
  Warwick: 'MIX', Shyvana: 'MIX',

  // Tanks que pueden escalar AP
  Galio: 'AP', Maokai: 'AP', Cho: 'AP', Malphite: 'AP',
  Singed: 'AP', Rumble: 'AP', Kennen: 'AP', Vladimir: 'AP',
  Mordekaiser: 'AP', Gwen: 'AP',
}

const NORMALIZED_DAMAGE_TYPE = Object.fromEntries(
  Object.entries(DAMAGE_TYPE).map(([key, value]) => [normalizeChampionKey(key), value])
) as Record<string, DmgType>

export function getDamageType(key: string, tags: string[]): DmgType {
  const explicit = NORMALIZED_DAMAGE_TYPE[normalizeChampionKey(key)]
  if (explicit) return explicit
  if (tags.includes('Mage')) return 'AP'
  return 'AD'
}

function tagsOf(key: string, all: ChampionEntry[]): string[] {
  return all.find(c => sameChampionKey(c.key, key))?.tags ?? []
}

// ─── Interfaces públicas ──────────────────────────────────────────────────────

export interface DamageProfile {
  adCount: number
  apCount: number
  mixCount: number
  total: number
}

export interface CompositionNeeds {
  needsFrontline: boolean
  needsAP: boolean          // equipo propio sin daño AP real
  needsAD: boolean          // equipo propio sin daño AD real (raro pero posible)
  needsPeel: boolean
  allyDmg: DamageProfile
  enemyDmg: DamageProfile
  enemyHasEngageCC: boolean
}

// ─── Análisis ─────────────────────────────────────────────────────────────────

export function analyzeComposition(
  allyKeys: string[],
  enemyKeys: string[],
  allChampions: ChampionEntry[]
): CompositionNeeds {
  const allyEntries  = allyKeys.map(k => {
    const c = allChampions.find(c => sameChampionKey(c.key, k))
    return { tags: c?.tags ?? [], key: k }
  })
  const enemyEntries = enemyKeys.map(k => {
    const c = allChampions.find(c => sameChampionKey(c.key, k))
    return { tags: c?.tags ?? [], key: k }
  })

  const profile = (entries: { key: string; tags: string[] }[]): DamageProfile => {
    let adCount = 0, apCount = 0, mixCount = 0
    for (const e of entries) {
      const t = getDamageType(e.key, e.tags)
      if (t === 'AD')  adCount++
      if (t === 'AP')  apCount++
      if (t === 'MIX') { mixCount++; adCount += 0.5; apCount += 0.5 }
    }
    return { adCount, apCount, mixCount, total: entries.length }
  }

  const allyDmg  = profile(allyEntries)
  const enemyDmg = profile(enemyEntries)

  const allyHas  = (tag: string) => allyEntries.some(e => e.tags.includes(tag))
  const enemyHas = (tag: string) => enemyEntries.some(e => e.tags.includes(tag))

  return {
    needsFrontline:   allyKeys.length > 0 && !allyHas('Tank') && !allyHas('Fighter'),
    needsAP:          allyKeys.length > 0 && allyDmg.apCount < 1,
    needsAD:          allyKeys.length > 0 && allyDmg.adCount < 1,
    needsPeel:        allyKeys.length > 0 && !allyHas('Support'),
    allyDmg,
    enemyDmg,
    enemyHasEngageCC: enemyHas('Tank') && enemyHas('Support'),
  }
}

// ─── Score de composición ─────────────────────────────────────────────────────

/**
 * Score 0.25–0.75.
 * Penaliza fuertemente añadir más del mismo tipo de daño cuando el equipo
 * ya está desequilibrado; boost al tipo que falta.
 */
export function compositionScore(
  candidateKey: string,
  candidateTags: string[],
  needs: CompositionNeeds
): number {
  let score = 0.5

  const has = (tag: string) => candidateTags.includes(tag)
  const candidateDmg = getDamageType(candidateKey, candidateTags)
  const isAP         = candidateDmg === 'AP' || candidateDmg === 'MIX'
  const isAD         = candidateDmg === 'AD' || candidateDmg === 'MIX'
  const isFrontline  = has('Tank') || has('Fighter')
  const isSupport    = has('Support')
  const isMarksman   = has('Marksman')
  const isAssassin   = has('Assassin')

  const { allyDmg, enemyDmg } = needs

  // ── Balance AD/AP del equipo propio ──────────────────────────────────────
  // Cuántos aliados tienen ese tipo de daño ya (antes de este pick)
  const apRatio = allyDmg.total > 0 ? allyDmg.apCount / allyDmg.total : 0
  const adRatio = allyDmg.total > 0 ? allyDmg.adCount / allyDmg.total : 0

  // Equipo full-AD (0 AP) → urgente añadir AP
  if (needs.needsAP && isAP)                 score += 0.15
  // Equipo mayoría AD (1 AP de 3+) → añadir AP es valioso
  else if (apRatio < 0.30 && isAP)           score += 0.10
  // Equipo mayoritariamente AP → añadir AD es valioso
  else if (adRatio < 0.30 && isAD && !isAP) score += 0.10
  // Equipo full-AP (raro) → urgente añadir AD
  if (needs.needsAD && isAD)                 score += 0.15

  // Penalización por añadir el tipo que ya abunda
  if (apRatio >= 0.60 && isAP && !isAD)      score -= 0.08
  if (adRatio >= 0.70 && isAD && !isAP)      score -= 0.05  // equipo natural AD, penaliza menos

  // ── Contrarrestar tipo de daño enemigo ────────────────────────────────────
  // Muchos AD enemigos → frontal y tanques son buenos (absorben daño físico)
  const enemyApRatio = enemyDmg.total > 0 ? enemyDmg.apCount / enemyDmg.total : 0
  const enemyAdRatio = enemyDmg.total > 0 ? enemyDmg.adCount / enemyDmg.total : 0

  if (enemyAdRatio >= 0.6 && isFrontline)              score += 0.06
  if (enemyApRatio >= 0.6 && (isMarksman || isFrontline)) score += 0.05
  if (needs.enemyHasEngageCC && (isAP || isMarksman))   score += 0.05

  // ── Huecos de composición ─────────────────────────────────────────────────
  if (needs.needsFrontline && isFrontline)  score += 0.08
  if (needs.needsPeel && isSupport)         score += 0.07

  // Penalización por añadir assassin sin frontline
  if (needs.needsFrontline && isAssassin && !isFrontline) score -= 0.06

  return Math.max(0.25, Math.min(0.75, score))
}
