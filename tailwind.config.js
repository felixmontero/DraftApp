/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        'lol-dark': '#050a0f',
        'lol-panel': '#081018',
        'lol-surface': '#0d1722',
        'lol-surface2': '#121e2b',
        'lol-border': '#1a2a3a',
        'lol-border-bright': '#2b4258',
        'lol-gold': '#c9a24c',
        'lol-gold-light': '#e0bd68',
        'lol-blue': '#38bdf8',
        'lol-blue-dim': '#0b3143',
        'lol-green': '#57d17a',
        'lol-red': '#e05264',
        'lol-red-dim': '#30151d',
        'lol-text': '#b9c4cf',
        'lol-text-dim': '#6f7f91'
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        gold: '0 0 0 1px rgba(201,162,76,0.25)',
        blue: '0 0 0 1px rgba(56,189,248,0.18)',
        panel: '0 18px 50px rgba(0,0,0,0.32)'
      }
    }
  },
  plugins: []
}
