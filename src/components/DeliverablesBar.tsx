'use client';

import { BookOpen, ExternalLink, FileText, MonitorPlay, Presentation, type LucideIcon } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { setDeliverable } from '@/app/actions';
import { DELIVERABLES, type DeliverableKind, type Deliverables } from '@/lib/types';

const SLOTS: Record<DeliverableKind, { label: string; Icon: LucideIcon; placeholder: string }> = {
  presentation: { label: 'Presentation', Icon: Presentation, placeholder: 'Link to slides' },
  demo: { label: 'Demo', Icon: MonitorPlay, placeholder: 'Link to live demo' },
  report: { label: 'Report', Icon: FileText, placeholder: 'Link to report' },
  documentation: { label: 'Documentation', Icon: BookOpen, placeholder: 'Link to docs' },
};

// M11: four pinned project links above the board. Saves on Enter or when the field loses focus.
export default function DeliverablesBar({ projectId, links }: { projectId: string; links: Deliverables }) {
  const set = DELIVERABLES.filter((k) => links[k]).length;

  return (
    <section aria-labelledby="deliverables-title" className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 id="deliverables-title" className="text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-700 dark:text-slate-200">
          Project links
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {set} of {DELIVERABLES.length} added
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {DELIVERABLES.map((kind) => (
          <Slot key={kind} projectId={projectId} kind={kind} saved={links[kind]} />
        ))}
      </div>
    </section>
  );
}

function Slot({ projectId, kind, saved }: { projectId: string; kind: DeliverableKind; saved: string }) {
  const slot = SLOTS[kind];
  const [value, setValue] = useState(saved);
  const [status, setStatus] = useState<{ kind: 'saving' | 'saved' | 'error'; text?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  // Pick up fresh server data (e.g. after a save elsewhere) unless the user is mid-edit.
  useEffect(() => setValue(saved), [saved]);

  const filled = Boolean(saved);
  const inputId = `link-${kind}`;
  const statusId = `link-${kind}-status`;

  function save() {
    if (value.trim() === saved) return;
    setStatus({ kind: 'saving' });
    startTransition(async () => {
      const result = await setDeliverable(projectId, kind, value);
      if (result.ok) {
        setValue(value.trim());
        setStatus({ kind: 'saved' });
        setTimeout(() => setStatus(null), 2000);
      } else {
        setStatus({ kind: 'error', text: result.error });
      }
    });
  }

  return (
    <div
      className={`rounded-lg border bg-surface-card p-3 shadow-[0_1px_2px_rgba(15,23,42,0.05)] dark:bg-surface-card-dark ${
        status?.kind === 'error' ? 'border-red-300 dark:border-red-500/50' : 'border-slate-200 dark:border-slate-700/70'
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <slot.Icon className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden />
        <label htmlFor={inputId} className="text-sm font-medium text-slate-800 dark:text-slate-100">
          {slot.label}
        </label>
        {/* Status dot: hollow = empty, filled = link added. Text says the same for screen readers. */}
        <span
          className={`ml-auto h-3 w-3 rounded-full border-2 ${filled ? 'border-brand bg-brand dark:border-brand-dark dark:bg-brand-dark' : 'border-slate-300 dark:border-slate-600'}`}
          aria-hidden
        />
        <span className="sr-only">{filled ? 'Link added' : 'No link yet'}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <input
          id={inputId}
          type="url"
          inputMode="url"
          value={value}
          placeholder={slot.placeholder}
          onChange={(e) => {
            setValue(e.target.value);
            if (status?.kind === 'error') setStatus(null);
          }}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              save();
            }
            if (e.key === 'Escape') setValue(saved);
          }}
          disabled={pending}
          aria-describedby={statusId}
          aria-invalid={status?.kind === 'error'}
          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        {filled && (
          <a
            href={saved}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${slot.label} link in a new tab`}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-brand-dark"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        )}
      </div>
      <p id={statusId} aria-live="polite" className={`mt-1 min-h-[1rem] text-[11px] ${status?.kind === 'error' ? 'text-red-700 dark:text-red-300' : 'text-slate-400'}`}>
        {status?.kind === 'saving' ? 'Saving…' : status?.kind === 'saved' ? 'Saved' : status?.kind === 'error' ? status.text : filled ? '' : 'Enter to save'}
      </p>
    </div>
  );
}
