# DraftApp - Registro de Progreso

## Estado General

`PROYECTO.md` queda como referencia historica; este archivo y `RELEASE_CHECKLIST.md` son la fuente viva de estado y release.

| Fase | Estado | Descripcion |
|------|--------|-------------|
| Fase 1 - Setup | Completada | Proyecto Electron + React + TypeScript funcionando |
| Fase 2 - LCU | Completada | Conexion, polling y eventos de champion select |
| Fase 3 - Datos | Completada | Data Dragon, Lolalytics, cache local y protocolo `ddragon://` |
| Fase 4 - Engine | Completada | Scoring para picks/bans, counters y composicion |
| Fase 5 - Overlay UI | En progreso avanzado | Overlay usable, modo compacto, historial, builds/runas y draft en vivo |
| Fase 6 - Distribucion | En progreso | `pack:win` genera release interno Windows; checklist de release documentada |

---

## Implementado

### Base de App

- Ventana Electron frameless, transparente, always-on-top y redimensionable.
- IPC seguro con allowlist en preload.
- Persistencia local de preferencias del overlay con `electron-store`.
- Restauracion de modo compacto, posicion y tamano de ventana entre sesiones.
- Panel de ajustes para modo compacto, siempre visible y restaurar ventana.

### Integracion LCU

- Deteccion de conexion al cliente de LoL.
- Lectura REST de `/lol-champ-select/v1/session`.
- Suscripcion WebSocket a eventos de champion select.
- Parser de sesiones LCU a `DraftState`.
- Limpieza robusta al terminar champion select, dodge o desconexion.
- Fixtures de champion select para ban, pick aliado, pick rival, finalizacion y evento `Delete`.

### Datos

- Fetch de parche actual y lista de campeones desde Data Dragon.
- Mapeo de champion IDs a keys de Data Dragon.
- Descarga de iconos de runas.
- Scraper de Lolalytics para stats, counters y builds.
- Cache local por parche para reducir llamadas repetidas.

### Engine de Recomendaciones

- Recomendaciones precisas de pick segun rol local, fase de draft, counters, tier y composicion.
- Recomendaciones de ban en turno aliado.
- Bans ajustados por amenazas visibles y por huecos de composicion enemiga.
- Normalizacion de champion keys para evitar fallos por nombres especiales.
- Fingerprinting para evitar recalculos redundantes y descartar resultados obsoletos.

### Overlay UI

- `StatusBar` con estado de conexion y champion select.
- `DraftBoard` con picks, bans, timer y rol.
- Click en campeones aliados del draft para reabrir build y runas cuando haya rol.
- `RecommendationPanel` contextual para picks, bans y turno rival.
- Seleccion fijada para no perder runas cuando el campeon elegido desaparece de recomendaciones.
- `BuildPanel` con items y runas.
- Vista compacta de runas para modo compacto.
- Rediseno minimalista evolutivo con paneles sobrios, cards densas y jerarquia tipo analyst tool.
- Historial local de drafts con almacenamiento anonimo, limite de entradas y acciones de borrado.
- Auto-build del pick propio cuando el campeon local queda seleccionado.
- Filtros para evitar guardar drafts vacios o basados solo en hovers.
- Script `pack:win` para release interno en `release/win-unpacked/DraftApp.exe`.

---

## Verificaciones Actuales

- `npm run test`
- `npm run typecheck`
- `npm run build`
- `npm run pack:win`
- `npm audit --omit=dev --audit-level=high`

---

## Siguiente Paso Recomendado

1. Probar con champion selects reales y guardar fixtures anonimizados.
2. Ejecutar la checklist de release interno Windows en `RELEASE_CHECKLIST.md`.
3. Preparar instalador Windows completo (`dist:win`) y notas de release interno.
4. Empezar un dataset pequeno de evaluacion para medir si las recomendaciones realmente aciertan en drafts reales.
5. Anadir pruebas de renderer para estados clave del overlay.
