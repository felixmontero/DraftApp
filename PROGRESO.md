# DraftApp — Registro de Progreso

## Estado general

| Fase | Estado | Descripción |
|------|--------|-------------|
| Fase 1 — Setup | ✅ Completada | Proyecto inicializado y funcionando |
| Fase 2 — LCU | ✅ Completada | Conexión con cliente LoL |
| Fase 3 — Datos | ⬜ Pendiente | Data Dragon + Lolalytics |
| Fase 4 — Engine | ⬜ Pendiente | Motor de scoring |
| Fase 5 — Overlay UI | ⬜ Pendiente | UI completa |
| Fase 6 — Distribución | ⬜ Pendiente | Instalador Windows |

---

## Fase 1 — Setup del proyecto ✅

**Fecha:** 14 abril 2026

### Qué se hizo

#### Dependencias instaladas
| Paquete | Versión | Rol |
|---------|---------|-----|
| electron | ^31.0.2 | Framework desktop |
| electron-vite | ^2.3.0 | Build tool unificado main+preload+renderer |
| react + react-dom | ^18.3.1 | UI |
| typescript | ^5.5.2 | Tipado |
| tailwindcss | ^3.4.6 | Estilos |
| electron-builder | ^24.13.3 | Empaquetado/distribución |
| vite | ^5.3.1 | Dev server y bundler |
| lcu-connector | ^2.1.4 | Conexión con cliente LoL (Fase 2) |
| axios | ^1.7.2 | HTTP requests (Fase 3) |
| electron-store | ^8.2.0 | Caché local (Fase 3) |

> **Nota:** `lcu-connector` estaba en v1.3.1 en el plan original pero la versión publicada actual es v2.1.4. Se actualizó.

#### Archivos de configuración creados
- `electron.vite.config.ts` — build unificado con alias `@shared` y `@renderer`
- `tsconfig.json` / `tsconfig.node.json` / `tsconfig.web.json` — tipado separado para main y renderer
- `tailwind.config.js` — paleta de colores LoL-style personalizada
- `postcss.config.js` — autoprefixer
- `electron-builder.config.ts` — target NSIS x64 para Windows, output en `/release`

#### Estructura de carpetas creada
```
src/
├── main/
│   ├── index.ts          ✅ Ventana Electron frameless + handlers IPC
│   ├── lcu/
│   │   ├── connector.ts  ⬜ Placeholder Fase 2
│   │   ├── events.ts     ⬜ Placeholder Fase 2
│   │   └── types.ts      ✅ Tipos LCU API definidos
│   ├── data/
│   │   ├── datadragon.ts ⬜ Placeholder Fase 3
│   │   ├── lolalytics.ts ⬜ Placeholder Fase 3
│   │   └── cache.ts      ⬜ Placeholder Fase 3
│   ├── engine/
│   │   ├── scorer.ts     ⬜ Placeholder Fase 4
│   │   └── recommendations.ts ⬜ Placeholder Fase 4
│   └── overlay.ts        ⬜ Placeholder Fase 5
├── preload/
│   └── index.ts          ✅ API IPC segura via contextBridge
├── renderer/
│   ├── index.html        ✅
│   └── src/
│       ├── main.tsx       ✅ Entry point React
│       ├── App.tsx        ✅ Layout principal
│       ├── index.css      ✅ Tailwind + estilos base
│       ├── env.d.ts       ✅ Tipos window.api para TypeScript
│       └── components/
│           ├── StatusBar.tsx         ✅ Estado conexión LoL
│           ├── DraftBoard.tsx        ✅ Tablero picks/bans
│           ├── RecommendationPanel.tsx ✅ Lista recomendaciones
│           ├── ChampionCard.tsx      ✅ Tarjeta de campeón
│           └── BuildPanel.tsx        ✅ Placeholder Fase 5
└── shared/
    ├── types.ts      ✅ Todos los tipos compartidos
    └── constants.ts  ✅ IPC channels, roles, URLs
```

#### UI implementada

**Paleta de colores:**
| Token | Hex | Uso |
|-------|-----|-----|
| `lol-dark` | `#060d14` | Title bar, fondos profundos |
| `lol-panel` | `#0d1826` | Fondo principal |
| `lol-surface` | `#162032` | Tarjetas y secciones |
| `lol-surface2` | `#1c2a40` | Hover / elevated |
| `lol-border` | `#1e3a5f` | Borde base |
| `lol-border-bright` | `#2a6090` | Borde activo |
| `lol-gold` | `#c89b3c` | Dorado LoL |
| `lol-gold-light` | `#e8bc5a` | Dorado claro (texto) |
| `lol-blue` | `#0bc4e3` | Cyan LoL |
| `lol-red` | `#c0392b` | Bans / enemigos |
| `lol-text` | `#a9b8c8` | Texto secundario |
| `lol-text-dim` | `#5a7090` | Texto apagado |

**Ventana Electron:**
- Frameless, transparent, always-on-top
- Tamaño: 420×780 (mínimo 360×600)
- Barra de título draggable con `WebkitAppRegion: drag`
- Botones cerrar (`×`) y minimizar (`—`) via IPC (`ipcMain.handle`)
- Línea decorativa dorada bajo el header

**Componentes:**
- `StatusBar` — muestra estado de conexión con 3 estados: disconnected / connected / in_draft
- `DraftBoard` — slots de bans (5 aliados + 5 enemigos) y picks con labels de rol (TOP/JGL/MID/BOT/SUP)
- `RecommendationPanel` — lista de campeones con score, barra de progreso y razón principal. Actualmente con **mock data** (5 campeones) para visualizar el diseño
- `ChampionCard` — icono del campeón (Data Dragon), nombre, score en pts, barra de color según score (dorado ≥90, cyan ≥75, azul resto)

#### IPC implementado
| Canal | Dirección | Función |
|-------|-----------|---------|
| `window:minimize` | Renderer → Main | Minimiza la ventana |
| `window:close` | Renderer → Main | Cierra la app |

Los canales de la Fase 2 en adelante están definidos en `src/shared/constants.ts` listos para implementar.

### Decisiones tomadas en esta fase

- **`lcu-connector` v2.1.4** en vez de v1.3.1 (versión del plan) — la v1 no existe en npm.
- **`electron-vite`** como build tool unificado — maneja main + preload + renderer en un solo proceso, HMR nativo.
- **`ipcMain.handle`** (no `.on`) para los controles de ventana — necesario cuando el renderer usa `ipcRenderer.invoke`.
- **Mock data en RecommendationPanel** — para poder visualizar el diseño completo durante el desarrollo de las fases 2-4. Se eliminará cuando el engine esté listo.

### Verificaciones
- [x] `npm run build` — sin errores
- [x] `npm run typecheck` — sin errores
- [x] `npm run dev` — Electron abre, React renderiza, Tailwind funciona
- [x] Hot reload activo
- [x] Botón cerrar funciona
- [x] Botón minimizar funciona
- [x] Ventana arrastrable

---

## Próximo paso — Fase 2: Conexión LCU

Implementar en `src/main/lcu/`:

1. **`connector.ts`** — usar `lcu-connector` para detectar el lockfile y obtener credenciales
2. **`events.ts`** — suscribirse al WebSocket `/lol-champ-select/v1/session` y parsear el estado del draft
3. **`index.ts`** (main) — enviar el estado al renderer via `ipcMain` cuando cambie el draft
4. **`StatusBar.tsx`** — conectar con el IPC real (eliminar mock `'disconnected'`)
5. **`DraftBoard.tsx`** — renderizar picks/bans reales del draft state
