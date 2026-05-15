# DraftApp - Checklist de Release Interno Windows

## Artefactos

- `npm run pack:win`: genera carpeta portable para smoke test en `release/win-unpacked/DraftApp.exe`.
- `npm run dist:win`: genera instalador Windows para distribucion interna.
- Usar siempre artefactos regenerados desde el ultimo commit validado.

## Gates Locales

- `npm run test`
- `npm run typecheck`
- `npm run build`
- `npm audit --omit=dev --audit-level=high`

## Smoke Test Windows

- Abrir `release/win-unpacked/DraftApp.exe`.
- Verificar que la ventana abre, se puede mover y redimensionar.
- Verificar botones de minimizar, modo compacto, ajustes, always-on-top y reset de ventana.
- Verificar historial vacio, borrado individual y limpiar historial.
- Verificar que el modo compacto muestra recomendaciones, pick propio y build/runas sin desbordes.

## QA con Cliente LoL

- LoL cerrado: estado sin conexion.
- LoL abierto sin champion select: estado conectado.
- Champion select: bans aliados y rivales.
- Pick aliado: recomendaciones y auto-build del pick propio.
- Pick rival: no bloquear UI y mantener contexto.
- Dodge/remake/finalizacion: limpieza de draft e historial sin entradas fantasma.
- Desconexion/reconexion: no romper overlay ni duplicar recomendaciones.

## Notas de Distribucion

- Release interno sin firma: Windows SmartScreen puede mostrar advertencia.
- Sin auto-update: las nuevas versiones se distribuyen manualmente.
- El historial se guarda localmente y no envia telemetria.
- Lolalytics y Data Dragon son dependencias externas; si fallan, la app debe degradar con cache o datos fallback.
