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
      className={(size === 'lg' ? 'w-[min(60rem,calc(100vw-2rem))] ' : 'w-[min(42rem,calc(100vw-2rem))] ') + "m-auto rounded-xl border border-line bg-raised p-0 text-fg shadow-modal backdrop:bg-scrim/60"}
    >
      <div className="flex max-h-[90vh] flex-col">{children}</div>
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
      className={`flex items-start justify-between gap-4 border-b border-b-line px-5 py-4 ${accent ? `border-l-4 ${accent}` : ''}`}
    >
      <div className="min-w-0">
        {eyebrow && <div className="flex items-center gap-2 text-xs">{eyebrow}</div>}
        <h2 id={id} className="mt-0.5 text-base font-semibold leading-snug tracking-[-0.01em]">
          {title}
        </h2>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="-mr-2 rounded-md p-1.5 text-fg-subtle hover:bg-hover hover:text-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

// Shared control and form styles live in ./ui (a plain module, so server pages can use them too).
export { btn, field, fieldHint, fieldLabel } from './ui';
