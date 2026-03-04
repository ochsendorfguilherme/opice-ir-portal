/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lime: { DEFAULT: '#CAFF00', dark: '#A8D400' },
        brand: {
          black: '#111111',
          dark: '#0A0A0A',
          gray: '#555555',
          border: '#E0E0E0',
        },
        status: {
          done: '#22C55E',
          ongoing: '#F59E0B',
          planned: '#3B82F6',
          na: '#9CA3AF',
        }
      },
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        dm: ['DM Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0px',
        sm: '2px',
        md: '2px',
        lg: '2px',
        xl: '2px',
        '2xl': '2px',
        full: '9999px',
      },
      keyframes: {
        'pulse-amber': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(245,158,11,0.7)' },
          '50%': { boxShadow: '0 0 0 6px rgba(245,158,11,0)' },
        },
        'pulse-red': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(220,38,38,0.8)' },
          '50%': { boxShadow: '0 0 0 8px rgba(220,38,38,0)' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '70%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'fade-in-left': {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'siren': {
          '0%, 100%': { transform: 'rotate(-15deg)', opacity: '1' },
          '50%': { transform: 'rotate(15deg)', opacity: '0.8' },
        }
      },
      animation: {
        'pulse-amber': 'pulse-amber 1.5s ease-in-out infinite',
        'pulse-red': 'pulse-red 1s ease-in-out infinite',
        'bounce-in': 'bounce-in 0.5s ease-out forwards',
        'fade-in-left': 'fade-in-left 0.3s ease-out forwards',
        'siren': 'siren 0.5s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
