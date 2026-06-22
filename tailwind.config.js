/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Clay brand palette — warm terracotta */
        brand: {
          50:  '#FBF6F4',
          100: '#F1E7E3',
          200: '#E4C9BF',
          300: '#D4A898',
          400: '#C8806B',
          500: '#BD5C42',
          600: '#A2492F',
          700: '#8A3B28',
          800: '#6E2F20',
          900: '#4F2017',
        },
        /* Finance semantic colors */
        positive: {
          DEFAULT: '#4E7A52',
          tint: '#E6EEEA',
        },
        negative: {
          DEFAULT: '#B23E2E',
          tint: '#F4E3DF',
        },
        notice: {
          DEFAULT: '#A87E2E',
          tint: '#F0EAD8',
        },
        /* Shadcn-style tokens (HSL-based for compatibility with bg-primary etc) */
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-fg))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-fg))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-fg))',
        },
        accent: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--accent-fg))',
        },
      },
      borderRadius: {
        lg: '12px',
        md: '9px',
        sm: '6px',
        xl: '16px',
        '2xl': '20px',
      },
      fontFamily: {
        sans:  ['Hanken Grotesk', 'system-ui', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
        mono:  ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.18s ease-out',
        'slide-up': 'slideUp 0.22s ease-out',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
      boxShadow: {
        'xs':         '0 1px 2px rgba(33,30,26,0.04)',
        'card':       '0 2px 6px -2px rgba(33,30,26,0.08), 0 1px 2px rgba(33,30,26,0.04)',
        'card-hover': '0 8px 24px -8px rgba(33,30,26,0.12), 0 2px 6px -2px rgba(33,30,26,0.06)',
        'modal':      '0 24px 60px -16px rgba(33,30,26,0.20), 0 8px 24px -12px rgba(33,30,26,0.10)',
      },
    },
  },
  plugins: [],
}
