/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        ink: 'var(--ink)',
        mute: 'var(--mute)',
        card: 'var(--card)',
        chip: 'var(--chip)',
        tag: 'var(--tag)',
        line: 'var(--line)',
        line2: 'var(--line2)',
        primary: {
          DEFAULT: 'var(--primary)',
          soft: 'var(--primary-soft)',
          foreground: 'var(--on-primary)',
        },
        panel: 'var(--panel)',
        live: 'var(--live)',
        deep: 'var(--deep)',
        'on-deep': 'var(--on-deep)',
        'hi-deep': 'var(--hi-deep)',
        warn: 'var(--orange)',
      },
      fontFamily: {
        display: ['Bricolage Grotesque', 'Figtree', 'system-ui', 'sans-serif'],
        sans: ['Figtree', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['DM Mono', 'ui-monospace', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        glass: 'inset 0 1px 0 var(--hi), var(--shadow)',
        'glass-hover': 'inset 0 1px 0 var(--hi), 0 20px 45px -12px rgba(194,65,12,0.25)',
      },
      animation: {
        'pulse-subtle': 'pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float-slow': 'floatSlow 24s ease-in-out infinite alternate',
      },
      keyframes: {
        pulseSubtle: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.02)' },
        },
        floatSlow: {
          '0%': { transform: 'translate(0, 0) scale(1)' },
          '100%': { transform: 'translate(4vw, 3vw) scale(1.1)' },
        }
      }
    },
  },
  plugins: [],
}
