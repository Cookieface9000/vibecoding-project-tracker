// `rgb(var(--x) / <alpha-value>)` keeps opacity modifiers like bg-due-safe/10 working.
const v = (name) => `rgb(var(${name}) / <alpha-value>)`;

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
        // Meaning-carrying colours are CSS variables (globals.css) so the
        // colour-vision setting can re-map them app-wide.
        stage: {
          todo: v('--c-todo'),
          progress: v('--c-progress'),
          review: v('--c-review'),
          done: v('--c-done'),
        },
        feature: v('--c-feature'),
        bug: v('--c-bug'),
        due: {
          safe: v('--c-safe'),
          warning: v('--c-warning'),
          overdue: v('--c-overdue'),
          neutral: v('--c-neutral'),
        },
        // Readable text on tinted chips (darker in light mode, lighter in dark mode).
        ink: {
          safe: v('--ink-safe'),
          warning: v('--ink-warning'),
          overdue: v('--ink-overdue'),
          neutral: v('--ink-neutral'),
          feature: v('--ink-feature'),
          bug: v('--ink-bug'),
        },
      },
    },
  },
  plugins: [],
};
