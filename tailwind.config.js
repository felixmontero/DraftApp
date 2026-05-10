/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        'lol-dark': '#050810',
        'lol-panel': '#080e16',
        'lol-surface': '#0b1219',
        'lol-surface2': '#101a24',
        'lol-border': '#1a2733',
        'lol-border-bright': '#2e4050',
        'lol-gold': '#c49a3c',
        'lol-gold-light': '#e8c45a',
        'lol-blue': '#45c7ef',
        'lol-blue-dim': '#0b2a38',
        'lol-green': '#5fd27f',
        'lol-red': '#e05a66',
        'lol-red-dim': '#2b151a',
        'lol-text': '#c3ccd5',
        'lol-text-dim': '#6b7a8a'
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        panel: '0 20px 60px rgba(0,0,0,0.35)'
      }
    }
  },
  plugins: []
}
