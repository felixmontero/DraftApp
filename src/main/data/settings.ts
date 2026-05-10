import Store from 'electron-store'
import type { OverlaySettings, UserSettings } from '@shared/types'

const CURRENT_WINDOW_BOUNDS = {
  width: 390,
  height: 540
}

const LEGACY_DEFAULT_WINDOW_BOUNDS = {
  width: 940,
  height: 580
}

const DEFAULT_SETTINGS: UserSettings = {
  overlay: {
    compactMode: false,
    alwaysOnTop: true,
    windowBounds: CURRENT_WINDOW_BOUNDS
  }
}

const store = new Store<UserSettings>({
  name: 'draftapp-settings',
  defaults: DEFAULT_SETTINGS
})

export function getSettings(): UserSettings {
  const overlay = store.get('overlay', DEFAULT_SETTINGS.overlay)
  const windowBounds = {
    ...DEFAULT_SETTINGS.overlay.windowBounds,
    ...overlay.windowBounds
  }

  const usesLegacyDefaultBounds =
    windowBounds.width === LEGACY_DEFAULT_WINDOW_BOUNDS.width &&
    windowBounds.height === LEGACY_DEFAULT_WINDOW_BOUNDS.height

  const normalizedWindowBounds = usesLegacyDefaultBounds
    ? {
      ...windowBounds,
      ...CURRENT_WINDOW_BOUNDS
    }
    : windowBounds

  if (usesLegacyDefaultBounds) {
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
