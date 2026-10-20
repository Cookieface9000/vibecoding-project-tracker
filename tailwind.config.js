/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['var(--font-heading)', 'var(--font-body)', 'ui-sans-serif', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      // Design tokens — see DESIGN.md §2.
      colors: {
        brand: { DEFAULT: '#16A34A', dark: '#22C55E' },
        surface: {
          page: '#F7F7F8',
          'page-dark': '#0E1013',
          sidebar: '#1F2124',
          'sidebar-dark': '#15171A',
          header: '#FFFFFF',
          'header-dark': '#15171A',
          card: '#FFFFFF',
          'card-dark': '#1C1F24',
        },
        stage: {
          todo: '#64748B',
          progress: '#2563EB',
          review: '#7C3AED',
          done: '#16A34A',
        },
        feature: '#4F46E5',
        bug: '#DC2626',
        due: {
          safe: '#16A34A',
          warning: '#F59E0B',
          overdue: '#DC2626',
          neutral: '#94A3B8',
        },
      },
    },
  },
  plugins: [],
};
