import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Material Design 3 dark theme with cyan primary
        background: '#131315',
        surface: {
          DEFAULT: '#131315',
          container: '#201f21',
          'container-low': '#1c1b1d',
          'container-high': '#2a2a2c',
          'container-highest': '#353437',
          // Legacy surface scale (mapped to new dark palette)
          50: '#353437',
          100: '#2a2a2c',
          200: '#3c494e',
          300: '#4a4a4e',
          400: '#859398',
          500: '#9ca3af',
          600: '#bbc9cf',
          700: '#e5e1e4',
          800: '#201f21',
          900: '#131315',
          950: '#0a0a0b',
        },
        primary: {
          DEFAULT: '#a8e8ff',
          container: '#00d4ff',
          'fixed-dim': '#3cd7ff',
        },
        'on-primary': {
          DEFAULT: '#003642',
          container: '#00586b',
        },
        secondary: {
          DEFAULT: '#c6c4df',
          container: '#47475d',
        },
        tertiary: {
          DEFAULT: '#e6d8ff',
          container: '#cdb7ff',
        },
        'on-surface': {
          DEFAULT: '#e5e1e4',
          variant: '#bbc9cf',
        },
        outline: {
          DEFAULT: '#859398',
          variant: '#3c494e',
        },
        error: {
          DEFAULT: '#ffb4ab',
          container: '#93000a',
        },
        // Legacy madrid color mapped to cyan accent
        madrid: {
          50: '#0a2a33',
          100: '#003642',
          200: '#00586b',
          300: '#00849e',
          400: '#00b8d4',
          500: '#3cd7ff',
          600: '#00d4ff',
          700: '#a8e8ff',
          800: '#d0f4ff',
          900: '#e8faff',
          950: '#f5fdff',
        },
      },
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', '-apple-system', 'sans-serif'],
        headline: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-slide-up': 'fadeSlideUp 0.35s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'confetti-burst': 'confettiBurst 2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
        'scanline': 'scanline 8s linear infinite',
        'blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeSlideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        confettiBurst: {
          '0%': { opacity: '1', transform: 'translate(0, 0) rotate(0deg) scale(1)' },
          '70%': { opacity: '1' },
          '100%': { opacity: '0', transform: 'translate(var(--confetti-tx), var(--confetti-ty)) rotate(var(--confetti-rot)) scale(0.3)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
        'elevated': '0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.4)',
        'glow': '0 0 15px rgba(0, 212, 255, 0.3)',
        'glow-lg': '0 0 25px rgba(0, 212, 255, 0.4)',
        'neon': '0 0 5px rgba(60, 215, 255, 0.5), 0 0 10px rgba(60, 215, 255, 0.3)',
      },
    },
  },
  plugins: [],
} satisfies Config
