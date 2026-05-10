import Store from 'electron-store'
import type { OverlaySettings, UserSettings } from '@shared/types'

const DEFAULT_SETTINGS: UserSettings = {
  overlay: {
    compactMode: false,
    windowBounds: {
      width: 940,
      height: 580
    }
  }
}

const store = new Store<UserSettings>({
  name: 'draftapp-settings',
  defaults: DEFAULT_SETTINGS
})

export function getSettings(): UserSettings {
  const overlay = store.get('overlay', DEFAULT_SETTINGS.overlay)
  return {
    overlay: {
      compactMode: Boolean(overlay.compactMode),
      windowBounds: {
        ...DEFAULT_SETTINGS.overlay.windowBounds,
        ...overlay.windowBounds
      }
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
