'use client';

import { BookOpen, ChevronUp, ExternalLink, FileText, MonitorPlay, Pencil, Plus, Presentation, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRememberedOpen } from './useRememberedOpen';
import { setDeliverable } from '@/app/actions';
import { DELIVERABLES, type DeliverableKind, type Deliverables } from '@/lib/types';

const SLOTS: Record<DeliverableKind, { label: string; Icon: LucideIcon; placeholder: string }> = {
  presentation: { label: 'Presentation', Icon: Presentation, placeholder: 'https://slides…' },
  demo: { label: 'Demo', Icon: MonitorPlay, placeholder: 'https://demo…' },
  report: { label: 'Report', Icon: FileText, placeholder: 'https://report…' },
  documentation: { label: 'Documentation', Icon: BookOpen, placeholder: 'https://docs…' },
};

function displayHost(url: string) {
  try {
    const u = new URL(url);
    return u.host.replace(/^www\./, '') + (u.pathname !== '/' ? u.pathname : '');
  } catch {
    return url;
  }
}

// M11: four pinned project links in one compact, segmented bar. The arrow folds it away;
// open/closed is remembered per browser.
export default function DeliverablesBar({ projectId, links }: { projectId: string; links: Deliverables }) {
  const set = DELIVERABLES.filter((k) => links[k]).length;
  const [open, toggle] = useRememberedOpen('vibetracker.collapse.project-links');

  return (
    <section aria-labelledby="deliverables-title" className="mb-5">
      <div className={`flex items-baseline justify-between ${open ? 'mb-2' : ''}`}>
        <h2 id="deliverables-title" className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-controls="deliverables-slots"
            className="inline-flex items-center gap-1 uppercase hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            Project links
            <ChevronUp className={`h-3.5 w-3.5 transition-transform duration-150 ${open ? '' : 'rotate-180'}`} aria-hidden />
            <span className="sr-only">{open ? '(hide)' : '(show)'}</span>
          </button>
        </h2>
        <span className="tabular text-[12px] text-fg-subtle">
          {set}/{DELIVERABLES.length}
        </span>
      </div>
      {open && (
        <div
          id="deliverables-slots"
          className="grid grid-cols-1 overflow-hidden rounded-lg border border-line bg-surface shadow-card sm:grid-cols-2 xl:grid-cols-4"
        >
          {DELIVERABLES.map((kind, i) => (
            <Slot key={kind} projectId={projectId} kind={kind} saved={links[kind]} first={i === 0} />
          ))}
        </div>
      )}
    </section>
  );
}

function Slot({ projectId, kind, saved, first }: { projectId: string; kind: DeliverableKind; saved: string; first: boolean }) {
  const slot = SLOTS[kind];
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(saved);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setValue(saved), [saved]);
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const filled = Boolean(saved);
  const inputId = `link-${kind}`;
  const statusId = `link-${kind}-status`;

  function save() {
    if (value.trim() === saved) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const result = await setDeliverable(projectId, kind, value);
      if (result.ok) {
        setValue(value.trim());
        setError(null);
        setEditing(false);
      } else {
        setError(result.error);
      }
    });
  }

  function cancel() {
    setValue(saved);
    setError(null);
    setEditing(false);
  }

  return (
    <div
      className={`flex min-h-[64px] flex-col justify-center gap-1 px-3.5 py-2.5 ${
        first ? '' : 'border-t border-line sm:border-l sm:border-t-0'
      } ${error ? 'bg-red-50/60 dark:bg-red-500/[0.06]' : ''}`}
    >
      <div className="flex items-center gap-2">
        <slot.Icon className="h-3.5 w-3.5 text-fg-subtle" aria-hidden />
        <label htmlFor={inputId} className="text-[12px] font-medium text-fg-muted">
          {slot.label}
        </label>
        {/* Status dot: hollow = empty, filled = link added. Text says the same for screen readers. */}
        <span
          className={`ml-auto h-2 w-2 rounded-full ${filled ? 'bg-brand' : 'border border-line-strong'}`}
          aria-hidden
        />
        <span className="sr-only">{filled ? 'Link added' : 'No link yet'}</span>
      </div>

      {editing ? (
        <div>
          <input
            ref={inputRef}
            id={inputId}
            type="url"
            inputMode="url"
            value={value}
            placeholder={slot.placeholder}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                save();
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                cancel();
              }
            }}
            disabled={pending}
            aria-describedby={statusId}
            aria-invalid={Boolean(error)}
            className="block w-full rounded border border-line bg-surface px-2 py-1 text-[12px] text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-60"
          />
          <p id={statusId} aria-live="polite" className={`mt-1 text-[11px] ${error ? 'text-red-700 dark:text-red-300' : 'text-fg-subtle'}`}>
            {pending ? 'Saving…' : error ?? 'Enter to save · Esc to cancel'}
          </p>
        </div>
      ) : filled ? (
        <div className="flex min-w-0 items-center gap-1">
          <a
            href={saved}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex min-w-0 items-center gap-1 text-[12px] text-fg-muted hover:text-fg"
          >
            <span className="truncate">{displayHost(saved)}</span>
            <ExternalLink className="h-3 w-3 shrink-0 text-fg-subtle group-hover:text-fg-muted" aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Edit ${slot.label} link`}
            className="ml-auto rounded p-1 text-fg-subtle hover:bg-hover hover:text-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Pencil className="h-3 w-3" aria-hidden />
          </button>
        </div>
      ) : (
        <button
          type="button"
          id={inputId}
          onClick={() => setEditing(true)}
          className="inline-flex w-fit items-center gap-1 rounded text-[12px] text-fg-subtle hover:text-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Plus className="h-3 w-3" aria-hidden />
          Add link
        </button>
      )}
    </div>
  );
}
