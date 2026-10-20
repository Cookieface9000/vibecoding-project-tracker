// `rgb(var(--x) / <alpha-value>)` keeps opacity modifiers like bg-due-safe/10 working.
const v = (name) => `rgb(var(${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    // Corporate look: square corners everywhere. `rounded-full` is kept for the few
    // things that are meaningfully circular (status dots, avatars, toggle switch).
    borderRadius: {
      none: '0',
      sm: '0',
      DEFAULT: '0',
      md: '0',
      lg: '0',
      xl: '0',
      '2xl': '0',
      '3xl': '0',
      full: '9999px',
    },
    extend: {
      // One UI typeface (Plus Jakarta Sans, per the UI/UX Pro Max design system); mono for codes, prompts and keys.
      fontFamily: {
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      // Subtle motion (all wrapped in motion-safe: and switched off by Reduce motion).
      keyframes: {
        settle: {
          '0%': { opacity: '0.4', transform: 'translateY(-6px) scale(0.98)' },
          '60%': { opacity: '1', transform: 'translateY(1px) scale(1.005)' },
          '100%': { transform: 'translateY(0) scale(1)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgb(var(--brand) / 0)' },
          '40%': { boxShadow: '0 0 0 4px rgb(var(--brand) / 0.45)' },
        },
        'rise-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        settle: 'settle 360ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        glow: 'glow 1.2s ease-out 2',
        'rise-in': 'rise-in 280ms ease-out both',
      },
      boxShadow: {
        card: 'none', // flat: structure comes from 1 px borders
        lift: '0 8px 24px -6px rgb(var(--scrim) / 0.18), 0 2px 6px -2px rgb(var(--scrim) / 0.10)',
        modal: '0 24px 64px -12px rgb(var(--scrim) / 0.45)',
      },
      // Semantic theme tokens (globals.css). Each flips per theme, so components
      // don't need `dark:` colour variants and no surface is translucent.
      colors: {
        canvas: v('--canvas'),
        sunken: v('--sunken'),
        raised: v('--raised'),
        muted: v('--muted'),
        hover: v('--hover'),
        line: { DEFAULT: v('--line'), strong: v('--line-strong') },
        avatar: v('--avatar'),
        fg: { DEFAULT: v('--fg'), muted: v('--fg-muted'), subtle: v('--fg-subtle') },
        scrim: v('--scrim'),
        brand: {
          DEFAULT: v('--brand'),
          dark: v('--brand'), // legacy alias: the token already flips per theme
          hover: v('--brand-hover'),
          fg: v('--brand-fg'),
          soft: v('--brand-soft'),
          ink: v('--brand-ink'),
        },
        sidebar: {
          DEFAULT: v('--sidebar'),
          hover: v('--sidebar-hover'),
          active: v('--sidebar-active'),
          line: v('--sidebar-line'),
          fg: v('--sidebar-fg'),
          'fg-muted': v('--sidebar-fg-muted'),
        },
        // Legacy surface names, now backed by the same flipping tokens.
        surface: {
          DEFAULT: v('--surface'),
          page: v('--canvas'),
          'page-dark': v('--canvas'),
          sidebar: v('--sidebar'),
          'sidebar-dark': v('--sidebar'),
          header: v('--surface'),
          'header-dark': v('--surface'),
          card: v('--surface'),
          'card-dark': v('--surface'),
          tray: v('--sunken'),
          'tray-dark': v('--sunken'),
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
