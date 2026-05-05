import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: '#FFF8F0',
        card: '#FFFFFF',
        'card-border': '#F5E6D0',
        accent: '#FF6B00',
        'accent-gold': '#FFB300',
        'accent-burnt': '#E65100',
        'accent-soft': '#FF8F00',
        success: '#2E7D32',
        error: '#C62828',
        muted: '#8D6E63',
        cream: '#FFF3E0',
        ink: '#1A0A00',
        brown: '#5D3A1A',
        warn: '#FF8F00',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        gujarati: ['"Noto Sans Gujarati"', 'var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 14px -4px rgba(26, 10, 0, 0.08)',
        'card-hover': '0 12px 28px -8px rgba(26, 10, 0, 0.12)',
      },
    },
  },
  plugins: [],
}
export default config
