/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#0a0a0b',
        bg2:     '#111115',
        bg3:     '#17171d',
        bg4:     '#1e1e26',
        border:  '#1e1e26',
        border2: '#2a2a38',
        accent:  '#ff6b2b',
        accent2: '#e85a1f',
        ok:      '#2ecc8a',
        warn:    '#f5c842',
        err:     '#e84040',
        info:    '#4488ff',
        purple:  '#9966ff',
      },
      fontFamily: {
        sans: ['Syne', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        fadeup: 'fadeup 0.25s ease both',
        'spin': 'spin 1s linear infinite',
      },
      keyframes: {
        fadeup: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
