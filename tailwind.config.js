/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Bangladesh green, tuned for UI
        brand: {
          50: '#ECFDF6', 100: '#D1FAE9', 200: '#A6F2D4', 300: '#6BE3BA',
          400: '#2FCB9A', 500: '#0DAE80', 600: '#028C68', 700: '#006A4E',
          800: '#045443', 900: '#064538', 950: '#022720',
        },
        // Flag red, used sparingly for alerts and accents
        flag: {
          50: '#FFF1F2', 100: '#FFE0E3', 200: '#FFC6CD', 300: '#FF9AA6', 400: '#FB6B7B', 500: '#F42A41', 600: '#DA1530', 700: '#B70D25',
        },
        ink: {
          50: '#F6F7F9', 100: '#ECEEF2', 200: '#D5D9E2', 300: '#B0B7C6', 400: '#8490A6',
          500: '#64708A', 600: '#4E5970', 700: '#3F485B', 800: '#262C39', 900: '#171B24', 950: '#0C0F15',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Hind Siliguri"', 'system-ui', 'sans-serif'],
        bangla: ['"Hind Siliguri"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16,24,40,.04), 0 8px 24px -8px rgba(16,24,40,.10)',
        lift: '0 2px 4px rgba(16,24,40,.04), 0 24px 48px -16px rgba(16,24,40,.22)',
        glow: '0 0 0 1px rgba(13,174,128,.25), 0 12px 40px -8px rgba(13,174,128,.45)',
      },
      borderRadius: { '4xl': '2rem' },
      keyframes: {
        'scan-line': { '0%,100%': { top: '8%' }, '50%': { top: '88%' } },
        'road-dash': { to: { strokeDashoffset: '-80' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'pulse-ring': { '0%': { transform: 'scale(.8)', opacity: '.7' }, '100%': { transform: 'scale(2.2)', opacity: '0' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
      },
      animation: {
        'scan-line': 'scan-line 2.4s ease-in-out infinite',
        'road-dash': 'road-dash 1.2s linear infinite',
        shimmer: 'shimmer 1.6s infinite',
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(.2,.6,.3,1) infinite',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
