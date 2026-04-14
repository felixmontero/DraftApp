import type { Configuration } from 'electron-builder'

const config: Configuration = {
  appId: 'com.draftapp.lol',
  productName: 'DraftApp',
  copyright: 'Copyright © 2026 Félix Montero',
  directories: {
    buildResources: 'build',
    output: 'release'
  },
  files: [
    'out/**/*',
    '!out/**/*.map'
  ],
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      }
    ],
    icon: 'build/icon.ico'
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    installerIcon: 'build/icon.ico',
    uninstallerIcon: 'build/icon.ico',
    shortcutName: 'DraftApp'
  },
  publish: null
}

export default config
