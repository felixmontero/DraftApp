import type { Role } from './constants'

// ─── LCU / Draft ────────────────────────────────────────────────────────────

export interface DraftPlayer {
  cellId: number
  championId: number          // 0 si aún no seleccionado
  assignedPosition: Role | ''
  summonerId: number
}

export interface DraftAction {
  id: number
  type: 'ban' | 'pick'
  championId: number
  completed: boolean
  isAllyAction: boolean
  isInProgress: boolean
}

export interface DraftState {
  localPlayerCellId: number
  myTeam: DraftPlayer[]
  theirTeam: DraftPlayer[]
  actions: DraftAction[]   // parseSession aplana el array 2D de la LCU
  phase: 'PLANNING' | 'BAN_PICK' | 'FINALIZATION' | 'NONE'
  timeLeftMs: number
}

// ─── Campeones ───────────────────────────────────────────────────────────────

export interface Champion {
  id: number
  key: string     // e.g. "Aatrox"
  name: string    // e.g. "Aatrox"
  iconUrl: string
}

// ─── Recomendaciones ────────────────────────────────────────────────────────

export interface Recommendation {
  champion: Champion
  score: number           // 0–100
  breakdown: {
    winRate: number       // 0–1
    counterScore: number  // 0–1
    synergyScore: number  // 0–1
    tierBonus: number     // 0–1
  }
  reasons: string[]       // Mensajes legibles: "Counter vs Darius", "Sinergia con Jinx"
}

// ─── Build ───────────────────────────────────────────────────────────────────

export interface Build {
  championId: number
  role: Role
  items: number[]         // Item IDs
  runes: {
    primaryPath: number
    primaryRunes: number[]
    secondaryPath: number
    secondaryRunes: number[]
    shards: number[]
  }
}

// ─── Data Dragon ─────────────────────────────────────────────────────────────

export interface ChampionEntry {
  id: number      // numeric id (266 = Aatrox)
  key: string     // URL key  ("Aatrox")
  name: string    // display  ("Aatrox")
  tags: string[]  // ["Fighter", "Tank"]
}

// ─── Lolalytics ──────────────────────────────────────────────────────────────

export type Tier = 'S' | 'A' | 'B' | 'C' | 'D'

export interface Matchup {
  champKey: string
  winRate: number   // 0–1  (desde la perspectiva del campeón consultado)
  games: number
}

export interface ChampionStats {
  champKey: string
  role: Role
  patch: string     // short patch "16.7"
  winRate: number   // 0–1
  pickRate: number  // 0–1
  banRate: number   // 0–1
  tier: Tier
  matchups: Matchup[]  // top matchups ordenados por juegos
}

// ─── Estado de la app ────────────────────────────────────────────────────────

export type ConnectionStatus = 'disconnected' | 'connected' | 'in_draft'

export interface AppState {
  connection: ConnectionStatus
  patch: string
  draft: DraftState | null
  recommendations: Recommendation[]
  selectedBuild: Build | null
}
