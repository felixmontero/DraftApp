import Store from 'electron-store'
import type { OverlaySettings, UserSettings } from '@shared/types'

export const DEFAULT_WINDOW_BOUNDS = {
  width: 940,
  height: 580
}

export const MIN_WINDOW_BOUNDS = {
  width: 760,
  height: 520
}

const OBSOLETE_COMPACT_DEFAULT_BOUNDS = {
  width: 390,
  height: 540
}

const DEFAULT_SETTINGS: UserSettings = {
  overlay: {
    compactMode: false,
    alwaysOnTop: true,
    windowBounds: DEFAULT_WINDOW_BOUNDS
  }
}

const store = new Store<UserSettings>({
  name: 'draftapp-settings',
  defaults: DEFAULT_SETTINGS
})

export function getSettings(): UserSettings {
  const overlay = store.get('overlay', DEFAULT_SETTINGS.overlay)
  const windowBounds = {
    ...DEFAULT_WINDOW_BOUNDS,
    ...overlay.windowBounds
  }

  const usesObsoleteCompactDefault =
    !overlay.compactMode &&
    windowBounds.width === OBSOLETE_COMPACT_DEFAULT_BOUNDS.width &&
    windowBounds.height === OBSOLETE_COMPACT_DEFAULT_BOUNDS.height

  const normalizedWindowBounds = usesObsoleteCompactDefault
    ? {
      ...windowBounds,
      ...DEFAULT_WINDOW_BOUNDS
    }
    : {
      ...windowBounds,
      width: Math.max(windowBounds.width, MIN_WINDOW_BOUNDS.width),
      height: Math.max(windowBounds.height, MIN_WINDOW_BOUNDS.height)
    }

  if (usesObsoleteCompactDefault) {
    store.set('overlay.windowBounds', normalizedWindowBounds)
  }

  return {
    overlay: {
      compactMode: Boolean(overlay.compactMode),
      alwaysOnTop: overlay.alwaysOnTop !== false,
      windowBounds: normalizedWindowBounds
    }
  }
}

export function updateOverlaySettings(partial: Partial<OverlaySettings>): UserSettings {
  const current = getSettings().overlay
  const next: OverlaySettings = {
    ...current,
    ...partial,
    windowBounds: {
      ...current.windowBounds,
      ...partial.windowBounds
    }
  }
  store.set('overlay', next)
  return getSettings()
}
