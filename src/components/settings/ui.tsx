// Small shared pieces for the settings panels.

export const settingsField =
  'mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800/60';
export const settingsLabel = 'block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400';

export function PanelTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5">
      <h3 className="font-heading text-lg font-medium text-slate-900 dark:text-white">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
    </div>
  );
}

export function PlaceholderNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
      {children}
    </p>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[1.75rem] items-center justify-center rounded-md border border-b-2 border-slate-300 bg-white px-1.5 py-0.5 font-mono text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
      {children}
    </kbd>
  );
}
