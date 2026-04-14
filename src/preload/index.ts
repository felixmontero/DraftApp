import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { IPC } from '../shared/constants'

// API expuesta al renderer via contextBridge (sin node access directo)
const api = {
  // Escuchar eventos del proceso principal
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args))
  },
  off: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, (_event, ...args) => callback(...args))
  },
  // Invocar handlers del proceso principal
  invoke: (channel: string, ...args: unknown[]) => {
    return ipcRenderer.invoke(channel, ...args)
  }
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('electron', electronAPI)
  contextBridge.exposeInMainWorld('api', api)
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
