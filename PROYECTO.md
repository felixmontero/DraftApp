# DraftApp — Asistente de Draft para League of Legends

## Visión del proyecto

Aplicación de escritorio estilo Blitz.gg, pero sin paywalls, sin tracking y adaptada a las necesidades del usuario. Muestra recomendaciones de picks, counters y builds en tiempo real durante el champion select de LoL.

**Principios:**
- 100% gratuito, sin APIs de pago
- Sin telemetría ni recolección de datos
- UI limpia y no intrusiva
- Lógica de scoring transparente y configurable
- Funciona para todos los roles

---

## Arquitectura general

```
┌─────────────────────────────────────────────────────────┐
│                    League Client (LoL)                  │
│         expone LCU API en localhost:{puerto}            │
└────────────────────────┬────────────────────────────────┘
                         │ REST + WebSocket
┌────────────────────────▼────────────────────────────────┐
│                   Proceso Principal                     │
│                  (Electron Main)                        │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ lcu-connector│  │ data-service │  │ scorer-engine │  │
│  │             │  │              │  │               │  │
│  │ Detecta el  │  │ Lolalytics   │  │ Calcula score │  │
│  │ cliente LoL │  │ Data Dragon  │  │ por campeón:  │  │
│  │ Lee draft   │  │ Cache local  │  │ - win rate    │  │
│  │ en tiempo   │  │ de stats,    │  │ - counters    │  │
│  │ real via WS │  │ counters,    │  │ - synergies   │  │
│  │             │  │ builds,runas │  │ - tier list   │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │ IPC
┌────────────────────────▼────────────────────────────────┐
│                 Overlay (Electron Renderer)              │
│            Ventana transparente always-on-top           │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │  DraftBoard    │  RecommendationPanel           │   │
│   │                │                                │   │
│   │  [Ban] [Ban]   │  Top picks para tu rol:        │   │
│   │  [Ban] [Ban]   │  1. Campeón A  ████ 94pts      │   │
│   │  [Ban] [Ban]   │     Counter vs Darius ✓        │   │
│   │                │     Sinergia con Jinx ✓        │   │
│   │  [P1] [P2]     │  2. Campeón B  ████ 87pts      │   │
│   │  [P3] [P4]     │  3. Campeón C  ████ 82pts      │   │
│   │  [P5]          │                                │   │
│   │                │  Runas recomendadas            │   │
│   │                │  Build recomendado             │   │
│   └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Stack tecnológico

| Capa | Tecnología | Por qué |
|------|-----------|---------|
| Framework | **Electron** | Overlay nativo sobre el cliente de LoL |
| UI | **React + TypeScript** | Componentes reactivos, tipado fuerte |
| Estilos | **Tailwind CSS** | Rápido, sin overhead |
| Build | **Vite** | Dev server rápido, HMR |
| LCU | **lcu-connector** (npm) | Detecta el puerto/credenciales del cliente automáticamente |
| Imágenes/datos | **Riot Data Dragon** | API oficial gratuita de Riot |
| Stats/counters | **Lolalytics** (scraping) | Datos de win rate, counters, builds por parche |
| Cache | **electron-store** | Persiste datos entre sesiones |
| HTTP | **axios** | Requests a Data Dragon y Lolalytics |

---

## Estructura del proyecto

```
DraftApp/
├── src/
│   ├── main/                        # Proceso principal de Electron
│   │   ├── index.ts                 # Entry point, crea ventanas
│   │   ├── lcu/
│   │   │   ├── connector.ts         # Conexión con el cliente LoL
│   │   │   ├── events.ts            # Eventos WebSocket del draft
│   │   │   └── types.ts             # Tipos de la LCU API
│   │   ├── data/
│   │   │   ├── datadragon.ts        # Fetcher de Data Dragon (imágenes, nombres)
│   │   │   ├── lolalytics.ts        # Fetcher de stats/counters/builds
│   │   │   └── cache.ts             # Gestión de caché local
│   │   ├── engine/
│   │   │   ├── scorer.ts            # Motor de scoring de campeones
│   │   │   └── recommendations.ts  # Genera lista de recomendaciones
│   │   └── overlay.ts               # Gestión de la ventana overlay
│   │
│   ├── renderer/                    # UI React (overlay)
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   └── components/
│   │       ├── DraftBoard.tsx       # Tablero con picks/bans actuales
│   │       ├── ChampionCard.tsx     # Tarjeta de campeón recomendado
│   │       ├── RecommendationPanel.tsx  # Lista de recomendaciones
│   │       ├── BuildPanel.tsx       # Runas e items recomendados
│   │       └── StatusBar.tsx        # Estado de conexión con LoL
│   │
│   └── shared/
│       ├── types.ts                 # Tipos compartidos main/renderer
│       └── constants.ts             # Constantes (versión parche, URLs, etc.)
│
├── assets/
│   └── champions/                   # Cache de iconos descargados
│
├── PROYECTO.md                      # Este archivo
├── package.json
├── tsconfig.json
├── vite.config.ts
└── electron-builder.config.ts
```

---

## LCU API — Detalles técnicos

La **League Client Update (LCU) API** es una API REST + WebSocket que Riot expone localmente mientras el cliente está abierto.

### Detección automática del cliente
El cliente guarda sus credenciales en un archivo `lockfile`:
```
Windows: C:\Riot Games\League of Legends\lockfile
Contenido: <nombre>:<PID>:<puerto>:<contraseña>:<protocolo>
Ejemplo:  LeagueClient:12345:56789:abc123def:https
```
La librería `lcu-connector` automatiza esta detección.

### Endpoints principales del draft

| Endpoint | Descripción |
|----------|-------------|
| `GET /lol-champ-select/v1/session` | Estado completo del champion select |
| `WS /lol-champ-select/v1/session` | Actualizaciones en tiempo real |
| `GET /lol-summoner/v1/current-summoner` | Datos del jugador local |
| `GET /lol-perks/v1/pages` | Páginas de runas actuales |
| `PATCH /lol-champ-select/v1/session/actions/{id}` | Completar acción de pick/ban |

### Estructura del session object (draft)
```typescript
{
  localPlayerCellId: number,       // ID del jugador local en el draft
  myTeam: [{
    cellId: number,
    championId: number,            // 0 si aún no pickeado
    assignedPosition: string,      // "top" | "jungle" | "middle" | "bottom" | "utility"
    summonerId: number
  }],
  theirTeam: [{
    cellId: number,
    championId: number,
    assignedPosition: string
  }],
  actions: [[{                     // Array de fases del draft
    id: number,
    type: "ban" | "pick",
    championId: number,
    completed: boolean,
    isAllyAction: boolean,
    isInProgress: boolean          // Si es el turno actual
  }]],
  timer: {
    adjustedTimeLeftInPhase: number,
    phase: "PLANNING" | "BAN_PICK" | "FINALIZATION"
  }
}
```

---

## Motor de scoring

Cada campeón disponible recibe un **score de 0 a 100** calculado así:

```typescript
score = (
  winRate        * 0.30 +   // Win rate del campeón en el rol (Lolalytics)
  counterScore   * 0.35 +   // Qué tan bien counterea a los enemigos confirmados
  synergyScore   * 0.20 +   // Sinergia con picks aliados confirmados
  tierBonus      * 0.15     // Bonus por estar en S/A tier del parche actual
)
```

### Fuentes de datos gratuitas

**Riot Data Dragon** (`ddragon.leagueoflegends.com`):
- Lista de todos los campeones con IDs, nombres, roles
- Iconos y splash arts
- Datos base de estadísticas

**Lolalytics** (`lolalytics.com`):
- Win rates por campeón/rol/parche
- Matchup data (counter scores)
- Builds recomendados (items, runas)
- Tier lists actualizadas

Los datos se cachean localmente y se actualizan una vez por parche (~2 semanas).

---

## Fases de desarrollo

### Fase 1 — Setup del proyecto ✅
- [x] Inicializar proyecto con Electron + Vite + React + TypeScript
- [x] Configurar estructura de carpetas
- [x] Configurar Tailwind CSS
- [x] Setup de electron-builder para distribución
- [x] Verificar hot reload en desarrollo

### Fase 2 — Conexión con LCU ✅
- [x] Integrar `lcu-connector`
- [x] Detectar cuando el cliente LoL está abierto/cerrado
- [x] Suscribirse al WebSocket del champion select
- [x] Parsear el estado del draft en tiempo real
- [x] Comunicar estado al renderer via IPC
- [ ] Testear con una partida real

### Fase 3 — Datos de campeones
- [ ] Integrar Riot Data Dragon
- [ ] Descargar y cachear iconos de todos los campeones
- [ ] Implementar fetcher de Lolalytics (win rates, counters, builds)
- [ ] Sistema de caché local con actualización por parche
- [ ] Manejo de errores offline (usar cache si no hay internet)

### Fase 4 — Motor de recomendaciones
- [ ] Implementar función de scoring (win rate + counters + sinergia + tier)
- [ ] Filtrar por rol asignado
- [ ] Ordenar y devolver top 5 recomendaciones
- [ ] Incluir razones del score (por qué se recomienda cada campeón)
- [ ] Testear con composiciones reales

### Fase 5 — Overlay UI
- [ ] Crear ventana Electron transparente always-on-top
- [ ] Implementar DraftBoard (visualización de picks/bans actuales)
- [ ] Implementar RecommendationPanel (top 5 picks con scores)
- [ ] Implementar BuildPanel (runas e items para el pick elegido)
- [ ] Implementar StatusBar (conexión con LoL, parche actual)
- [ ] Posicionamiento automático según resolución detectada
- [ ] Modo arrastrar/redimensionar overlay

### Fase 6 — Pulido y distribución
- [ ] Instalador para Windows (electron-builder + NSIS)
- [ ] Auto-updater para nuevos parches
- [ ] Configuración de usuario (qué campeones tiene, preferencias)
- [ ] Ajuste fino del scoring según feedback real
- [ ] Ícono y branding de la app

---

## Resolución automática

Electron detecta la resolución sin captura de pantalla:

```typescript
import { screen } from 'electron'

const primaryDisplay = screen.getPrimaryDisplay()
const { width, height } = primaryDisplay.workAreaSize
const scaleFactor = primaryDisplay.scaleFactor
```

El overlay se posiciona y escala automáticamente según la resolución detectada, sin necesidad de configuración manual.

---

## Decisiones de diseño

| Decisión | Alternativa descartada | Razón |
|----------|----------------------|-------|
| LCU API | Template matching con OpenCV | Más fiable, no depende de resolución/UI del cliente |
| Lolalytics scraping | Base de datos propia | Datos siempre actualizados sin mantener BD |
| electron-store | SQLite | Más simple para datos de configuración/cache |
| Vite | webpack | Más rápido en desarrollo |
| Tailwind | CSS Modules | Velocidad de desarrollo |

---

## Referencias

- [LCU API Explorer](https://www.mingweisamuel.com/lcu-schema/tool/) — Documentación interactiva de todos los endpoints
- [Riot Data Dragon](https://developer.riotgames.com/docs/lol#data-dragon) — Assets y datos oficiales
- [lcu-connector npm](https://www.npmjs.com/package/lcu-connector) — Librería para conectar con el cliente
- [Lolalytics](https://lolalytics.com) — Fuente de stats y tier lists
