import React from 'react'
import StatusBar from './components/StatusBar'
import DraftBoard from './components/DraftBoard'
import RecommendationPanel from './components/RecommendationPanel'

export default function App(): React.JSX.Element {
  return (
    <div className="flex flex-col h-screen panel-gradient border border-lol-border rounded-lg overflow-hidden select-none shadow-2xl">

      {/* Barra de título */}
      <div
        className="h-9 bg-lol-dark flex items-center justify-between px-3 shrink-0 border-b border-lol-border"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-lol-gold/20 border border-lol-gold/50 flex items-center justify-center">
            <div className="w-2 h-2 rounded-sm bg-lol-gold" />
          </div>
          <span className="text-lol-gold-light text-xs font-bold tracking-widest uppercase">
            DraftApp
          </span>
        </div>

        {/* Controles de ventana — no-drag para que sean clicables */}
        <div
          className="flex items-center gap-1"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {/* Minimizar */}
          <button
            onClick={() => window.api.invoke('window:minimize')}
            className="w-6 h-6 rounded flex items-center justify-center text-lol-text-dim hover:text-white hover:bg-lol-surface2 transition-colors"
            title="Minimizar"
          >
            <svg width="10" height="2" viewBox="0 0 10 2" fill="currentColor">
              <rect width="10" height="2" rx="1" />
            </svg>
          </button>
          {/* Cerrar */}
          <button
            onClick={() => window.api.invoke('window:close')}
            className="w-6 h-6 rounded flex items-center justify-center text-lol-text-dim hover:text-white hover:bg-red-700 transition-colors"
            title="Cerrar"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            </svg>
          </button>
        </div>
      </div>

      {/* Línea decorativa dorada */}
      <div className="gold-line shrink-0" />

      {/* Status */}
      <StatusBar />

      {/* Contenido */}
      <div className="flex flex-col flex-1 overflow-hidden p-2 gap-2">
        <DraftBoard />
        <RecommendationPanel />
      </div>

    </div>
  )
}
