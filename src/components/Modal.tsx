'use client';

import { useEffect, useRef } from 'react';

// Native <dialog>: focus trap, Esc to close and a backdrop for free.
// Rendered only while open; clicking the backdrop closes it.
export default function Modal({
  onClose,
  labelledBy,
  size = 'md',
  children,
}: {
  onClose: () => void;
  labelledBy: string;
  size?: 'md' | 'lg';
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  // No close() in cleanup: removing the element already closes it, and a close() there
  // (e.g. during React StrictMode's effect re-run) fires a stray `close` event that
  // used to shut the modal right after it opened.
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    // showModal() focuses the first button; prefer a field marked data-autofocus.
    dialog?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
  }, []);

  return (
    <dialog
      ref={ref}
      // Ignore stale close events if the dialog is (still/again) open.
      onClose={() => {
        if (!ref.current?.open) onClose();
      }}
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
      aria-labelledby={labelledBy}
      className={(size === 'lg' ? 'w-[min(60rem,calc(100vw-2rem))] ' : 'w-[min(42rem,calc(100vw-2rem))] ') + "m-auto rounded-xl border border-slate-200 bg-surface-card p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm dark:border-slate-700 dark:bg-surface-card-dark dark:text-slate-100"}
    >
      <div className="flex max-h-[85vh] flex-col">{children}</div>
    </dialog>
  );
}

export function ModalHeader({
  id,
  eyebrow,
  title,
  accent,
  onClose,
}: {
  id: string;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  accent?: string;
  onClose: () => void;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-4 border-b border-b-slate-200 px-6 py-4 dark:border-b-slate-700 ${accent ? `border-l-4 ${accent}` : ''}`}
    >
      <div className="min-w-0">
        {eyebrow && <div className="flex items-center gap-2 text-xs">{eyebrow}</div>}
        <h2 id={id} className="mt-1 font-heading text-xl font-medium leading-snug">
          {title}
        </h2>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="-mr-2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 dark:hover:bg-slate-700 dark:hover:text-slate-200"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export const btn = {
  primary:
    'inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-60',
  secondary:
    'inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
  danger:
    'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10',
  dangerSolid:
    'inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 disabled:opacity-60',
};
