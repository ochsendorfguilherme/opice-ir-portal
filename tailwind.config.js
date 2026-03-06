/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#d6ff63',
          deep: '#b7ec23',
        },
        shell: {
          ink: '#15262b',
          teal: '#173038',
          deep: '#0f2128',
          mist: '#f3efe4',
          surface: '#fffdf8',
          border: 'rgba(21, 38, 43, 0.12)',
        },
        status: {
          done: '#299166',
          ongoing: '#d59b32',
          planned: '#4f83ff',
          na: '#8c969a',
        }
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
        display: ['Space Grotesk', 'Manrope', 'sans-serif'],
        syne: ['Space Grotesk', 'Manrope', 'sans-serif'],
        dm: ['Manrope', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.04em',
        tighter: '-0.03em',
        tight: '-0.02em',
        wide: '0.04em',
        wider: '0.06em',
        widest: '0.08em',
        label: '0.12em',
      },
      boxShadow: {
        shell: '0 18px 36px rgba(17, 29, 34, 0.08)',
        float: '0 26px 54px rgba(15, 33, 40, 0.18)',
      },
      keyframes: {
        'pulse-amber': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(213,155,50,0.5)' },
          '50%': { boxShadow: '0 0 0 8px rgba(213,155,50,0)' },
        },
        'pulse-red': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(212,90,88,0.55)' },
          '50%': { boxShadow: '0 0 0 10px rgba(212,90,88,0)' },
        },
        'fade-in-left': {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.92)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'pulse-amber': 'pulse-amber 1.6s ease-in-out infinite',
        'pulse-red': 'pulse-red 1.15s ease-in-out infinite',
        'fade-in-left': 'fade-in-left 0.3s ease-out forwards',
        'bounce-in': 'bounce-in 0.45s ease-out forwards',
      }
    },
  },
  plugins: [],
}
