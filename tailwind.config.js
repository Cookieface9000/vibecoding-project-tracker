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
        brand: { DEFAULT: '#4F46E5', dark: '#818CF8' },
        surface: {
          page: '#F6F7FB',
          'page-dark': '#0B0F19',
          sidebar: '#FFFFFF',
          'sidebar-dark': '#0F1422',
          column: '#EEF0F6',
          'column-dark': '#121827',
          card: '#FFFFFF',
          'card-dark': '#182033',
        },
        stage: {
          todo: '#64748B',
          progress: '#3B82F6',
          review: '#A855F7',
          done: '#10B981',
        },
        feature: '#6366F1',
        bug: '#F43F5E',
        due: {
          safe: '#0EA5E9',
          warning: '#F59E0B',
          overdue: '#EF4444',
          neutral: '#94A3B8',
        },
      },
    },
  },
  plugins: [],
};
