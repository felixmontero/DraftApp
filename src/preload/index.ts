import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC_INVOKE_CHANNELS, IPC_LISTEN_CHANNELS } from '../shared/constants'

const listenerMap = new WeakMap<(...args: unknown[]) => void, Electron.IpcRendererListener>()
const listenChannels = new Set<string>(IPC_LISTEN_CHANNELS)
const invokeChannels = new Set<string>(IPC_INVOKE_CHANNELS)

// API expuesta al renderer via contextBridge (sin node access directo)
const api = {
  // Escuchar eventos del proceso principal
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    if (!listenChannels.has(channel)) {
      throw new Error(`Canal IPC no permitido para escucha: ${channel}`)
    }
    const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]): void => callback(...args)
    listenerMap.set(callback, listener)
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  },
  off: (channel: string, callback: (...args: unknown[]) => void) => {
    const listener = listenerMap.get(callback)
    if (listener) {
      ipcRenderer.removeListener(channel, listener)
      listenerMap.delete(callback)
    }
  },
  // Invocar handlers del proceso principal
  invoke: (channel: string, ...args: unknown[]) => {
    if (!invokeChannels.has(channel)) {
      return Promise.reject(new Error(`Canal IPC no permitido para invoke: ${channel}`))
    }
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
