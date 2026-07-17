import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Faction colors — the core visual identity of PixelWars
        faction: {
          red:    '#ef4444',
          blue:   '#3b82f6',
          green:  '#22c55e',
          yellow: '#eab308',
          purple: '#a855f7',
          orange: '#f97316',
          white:  '#f8fafc',
          black:  '#09090b',
        },
        // Canvas background
        canvas: {
          bg:     '#0a0a0a',
          grid:   '#1a1a1a',
          border: '#2a2a2a',
        },
      },
      animation: {
        'pixel-place': 'pixelPlace 0.15s ease-out',
        'pulse-slow':  'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':     'fadeIn 0.3s ease-in-out',
      },
      keyframes: {
        pixelPlace: {
          '0%':   { transform: 'scale(1.4)', opacity: '0.7' },
          '100%': { transform: 'scale(1)',   opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        mono:  ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
