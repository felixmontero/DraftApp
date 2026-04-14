/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        'lol-dark':         '#060d14',   // title bar, fondo más profundo
        'lol-panel':        '#0d1826',   // fondo principal
        'lol-surface':      '#162032',   // tarjetas / secciones
        'lol-surface2':     '#1c2a40',   // hover / elevated
        'lol-border':       '#1e3a5f',   // borde base
        'lol-border-bright':'#2a6090',   // borde activo / highlight
        'lol-gold':         '#c89b3c',   // dorado LoL
        'lol-gold-light':   '#e8bc5a',   // dorado claro para texto
        'lol-blue':         '#0bc4e3',   // cyan LoL
        'lol-blue-dim':     '#0a6a80',   // cyan oscuro
        'lol-red':          '#c0392b',   // bans
        'lol-red-dim':      '#4a1010',   // fondo ban
        'lol-text':         '#a9b8c8',   // texto secundario
        'lol-text-dim':     '#5a7090',   // texto muy apagado
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        'gold': '0 0 12px rgba(200,155,60,0.3)',
        'blue': '0 0 12px rgba(11,196,227,0.25)',
      }
    }
  },
  plugins: []
}
