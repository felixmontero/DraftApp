/// <reference types="vite/client" />

interface Window {
  api: {
    on: (channel: string, callback: (...args: unknown[]) => void) => void
    off: (channel: string, callback: (...args: unknown[]) => void) => void
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
  }
}
