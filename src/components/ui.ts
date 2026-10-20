// Shared class strings for controls and forms. Deliberately NOT a client module:
// server components (e.g. the projects page) import these as plain strings.

// One control size everywhere: 32 px high, 6 px radius, 13 px medium text.
const base =
  'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-offset-surface-card-dark';

export const btn = {
  primary: base + ' bg-brand text-brand-fg hover:bg-brand-hover focus-visible:ring-brand',
  secondary:
    base +
    ' border border-line-strong bg-surface text-fg-muted hover:bg-hover hover:text-fg focus-visible:ring-brand',
  ghost:
    base +
    ' text-fg-muted hover:bg-hover hover:text-fg focus-visible:ring-brand',
  danger: base + ' text-red-700 hover:bg-red-50 focus-visible:ring-red-400/50 dark:text-red-400 dark:hover:bg-red-500/10',
  dangerSolid: base + ' bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-400/50',
};

// Shared form styles: 36 px fields, sentence-case labels, soft focus ring.
export const field =
  'mt-1.5 block w-full rounded-md border border-line-strong bg-surface px-3 py-[7px] text-[13px] text-fg shadow-card placeholder:text-fg-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:cursor-not-allowed disabled:bg-muted disabled:text-fg-subtle';
export const fieldLabel = 'block text-[12px] font-medium text-fg-muted';
export const fieldHint = 'mt-1 text-[12px] text-fg-subtle';
