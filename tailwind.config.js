/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        'xs': '480px',
      },
      colors: {
        // === FUTURISTIC DARK PALETTE ===
        space: {
          950: '#020817',  // deep space bg
          900: '#0F172A',  // surface
          800: '#1E293B',  // surface-2
          700: '#243044',  // surface-3
        },
        cyan: {
          DEFAULT: '#06B6D4',
          dark:    '#0891B2',
          glow:    'rgba(6,182,212,0.18)',
          50:      '#ECFEFF',
          100:     '#CFFAFE',
          200:     '#A5F3FC',
          300:     '#67E8F9',
          400:     '#22D3EE',
          500:     '#06B6D4',
          600:     '#0891B2',
          700:     '#0E7490',
          800:     '#155E75',
          900:     '#164E63',
          950:     '#083344',
        },
        neon: {
          green:  '#22C55E',
          blue:   '#3B82F6',
          purple: '#818CF8',
        },
        // === LEGACY PALETTE (preserved for dashboard compat) ===
        navy: {
          50:  '#E8F1F9',
          100: '#C5DBED',
          200: '#9CC1DE',
          300: '#6FA4CC',
          400: '#458BBC',
          500: '#1B6CA8',
          600: '#155792',
          700: '#10437A',
          800: '#0B305E',
          900: '#06203E',
          950: '#02132A',
        },
        stone: {
          50:  '#F7F6F3',
          100: '#EFEDE7',
          200: '#DBD7CC',
          300: '#C2BCAC',
          400: '#A8A192',
          500: '#8B8474',
          600: '#6F695C',
          700: '#544F46',
          800: '#3A3630',
          900: '#21201C',
        },
        ink: {
          DEFAULT: '#1A1714',  // --ink / --tinta
          soft:    '#6B5F52',  // --ink-soft / --tinta-500
          dark:    '#1A1714',
        },
        text: {
          DEFAULT: '#1A1714',  // --text / --tinta
          muted:   '#6B5F52',  // --text-muted / --tinta-500
          dim:     '#A89D8C',  // --tinta-300
        },
        moss: {
          50:  '#EEF2EA',
          100: '#D6DEC9',
          200: '#B6C49E',
          300: '#94A973',
          400: '#778D52',
          500: '#5C7340',
          600: '#475F44',
          700: '#374A35',
          800: '#293626',
          900: '#1C2519',
        },
        primary: {
          DEFAULT: '#3A4E2E',  // --primary / --bosque-500
          light:   '#556B45',  // --primary-light
          dark:    '#2A3A22',  // --primary-dark
        },
        accent: {
          DEFAULT: '#8B6F47',  // --cuero-500 (5.2:1 on white)
          light:   '#B8956A',  // --accent
          dark:    '#6B5539',
        },
        surface: '#FFFEFB',   // --surface
        bg:      '#F2EBDD',   // --bg
        border:  'rgba(26,23,20,0.08)',  // --border
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body:    ['Inter Tight', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card:       '0 1px 3px 0 rgba(0,0,0,0.30), 0 1px 2px -1px rgba(0,0,0,0.20)',
        'card-hover': '0 10px 25px -5px rgba(6,182,212,0.15), 0 8px 10px -6px rgba(0,0,0,0.30)',
        glow:       '0 0 20px rgba(6,182,212,0.35), 0 0 60px rgba(6,182,212,0.12)',
        'glow-blue':    '0 0 20px rgba(59,130,246,0.35), 0 0 60px rgba(59,130,246,0.12)',
        'glow-green':   '0 0 20px rgba(34,197,94,0.35), 0 0 60px rgba(34,197,94,0.12)',
        'glow-purple':  '0 0 20px rgba(129,140,248,0.35), 0 0 60px rgba(129,140,248,0.12)',
        'glow-moss':    '0 0 40px rgba(34,197,94,0.25)',
        neon:       '0 0 10px rgba(6,182,212,0.20), 0 0 30px rgba(6,182,212,0.08)',
      },
      backgroundImage: {
        'mesh-navy': 'radial-gradient(ellipse at 20% 20%, rgba(6,182,212,0.10) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(59,130,246,0.08) 0%, transparent 55%)',
        'mesh-dark': 'radial-gradient(ellipse at 20% 20%, rgba(6,182,212,0.15) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(59,130,246,0.10) 0%, transparent 55%)',
        'tile-navy': 'linear-gradient(135deg, rgba(6,182,212,0.10), rgba(59,130,246,0.06))',
        'tile-moss': 'linear-gradient(135deg, rgba(34,197,94,0.10), rgba(6,182,212,0.06))',
        'grid-lines': `
          repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(56,189,248,0.025) 59px, rgba(56,189,248,0.025) 60px),
          repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(56,189,248,0.025) 59px, rgba(56,189,248,0.025) 60px)
        `,
      },
      keyframes: {
        'marquee-scroll': {
          from: { transform: 'translateX(0)' },
          to:   { transform: 'translateX(calc(-100% / 3))' },
        },
        'pulse-neon': {
          '0%, 100%': {
            boxShadow: '0 0 10px rgba(6,182,212,0.20), 0 0 30px rgba(6,182,212,0.08)',
            borderColor: 'rgba(6,182,212,0.30)',
          },
          '50%': {
            boxShadow: '0 0 25px rgba(6,182,212,0.50), 0 0 70px rgba(6,182,212,0.18)',
            borderColor: 'rgba(6,182,212,0.65)',
          },
        },
        'scan-line': {
          '0%':   { transform: 'translateY(-100%)', opacity: '0' },
          '10%':  { opacity: '0.4' },
          '90%':  { opacity: '0.4' },
          '100%': { transform: 'translateY(100vh)', opacity: '0' },
        },
        'border-flow': {
          '0%':   { backgroundPosition: '0% 50%' },
          '50%':  { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'rotate-gradient': {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        drift: {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%':      { transform: 'translateX(6px)' },
        },
      },
      animation: {
        'marquee-scroll':  'marquee-scroll var(--marquee-duration, 40s) linear infinite',
        'pulse-neon':      'pulse-neon 2.5s ease-in-out infinite',
        'scan-line':       'scan-line 4s linear infinite',
        'border-flow':     'border-flow 3s ease infinite',
        'rotate-gradient': 'rotate-gradient 3s linear infinite',
        'float-slow':      'float-slow 5s ease-in-out infinite',
        drift:             'drift 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
