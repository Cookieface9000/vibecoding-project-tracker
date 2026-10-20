'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';

export type ToastMessage = { kind: 'ok' | 'error'; text: string; id: number };

// Small confirmation bottom-right; announced to screen readers; fades after 3 s.
// Shown as a manual popover so it sits in the top layer — above an open <dialog>
// and its backdrop, instead of being dimmed behind them.
export default function Toast({ toast, onDone }: { toast: ToastMessage | null; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!toast) {
      if (el.matches(':popover-open')) el.hidePopover();
      return;
    }
    // Re-show so it stacks above any dialog opened since.
    if (el.matches(':popover-open')) el.hidePopover();
    el.showPopover();
    const timer = setTimeout(onDone, 3000);
    return () => clearTimeout(timer);
  }, [toast, onDone]);

  return (
    <div
      ref={ref}
      popover="manual"
      role="status"
      aria-live="polite"
      className="inset-auto bottom-6 right-6 m-0 border-0 bg-transparent p-0"
    >
      {toast && (
        <div
          key={toast.id}
          className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ring-1 ${
            toast.kind === 'ok'
              ? 'bg-slate-900 text-white ring-slate-800 dark:bg-white dark:text-slate-900 dark:ring-slate-200'
              : 'bg-red-600 text-white ring-red-700'
          }`}
        >
          {toast.kind === 'ok' ? (
            <CheckCircle2 className="h-4 w-4 text-green-400 dark:text-green-600" aria-hidden />
          ) : (
            <XCircle className="h-4 w-4" aria-hidden />
          )}
          {toast.text}
        </div>
      )}
    </div>
  );
}
