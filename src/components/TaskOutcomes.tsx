'use client';

import { Bot, CheckCircle2, Pencil, Plus, Trash2, XCircle } from 'lucide-react';
import { useEffect, useRef, useState, useTransition } from 'react';
import { deleteOutcome, recordOutcome, updateOutcome } from '@/app/actions';
import { hasContext } from '@/lib/context';
import { outcomeSubjectLabel } from '@/lib/outcome-labels';
import { OUTCOME_RESULTS, type BoardTask, type OutcomeResult, type OutcomeSubject, type TaskOutcome } from '@/lib/types';
import { btn, field, fieldLabel } from './ui';

// Inside a task: a log of whether its prompts and context worked, and why, written by a person.
// Insights' outcome tree links here (focusOutcomeId), so an outcome opens ready to edit.

const REASON_MAX = 2000;

export function ResultBadge({ result }: { result: OutcomeResult }) {
  return result === 'success' ? (
    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink-safe">
      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
      Successful
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink-overdue">
      <XCircle className="h-3.5 w-3.5" aria-hidden />
      Unsuccessful
    </span>
  );
}

function ago(iso: string) {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`;
}

export default function TaskOutcomes({
  task,
  focusOutcomeId,
  onChanged,
}: {
  task: BoardTask;
  focusOutcomeId?: string;
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(focusOutcomeId ?? null);
  const focusRef = useRef<HTMLLIElement>(null);

  // Arriving from the Insights tree: bring that outcome into view, already open for editing.
  // Waits a moment for the dialog to open and lay out, or there's nothing to scroll yet.
  useEffect(() => {
    if (!focusOutcomeId) return;
    const timer = setTimeout(() => focusRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250);
    return () => clearTimeout(timer);
  }, [focusOutcomeId]);

  return (
    <div>
      {adding ? (
        <OutcomeForm task={task} onDone={() => setAdding(false)} onSaved={onChanged} />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className={`${btn.secondary} mb-3`}>
          <Plus className="h-4 w-4" aria-hidden />
          Record an outcome
        </button>
      )}

      {task.outcomes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong px-3 py-4 text-center text-xs text-fg-subtle">
          No outcomes yet. After trying a prompt or this task&apos;s context, record whether it worked and why, so the next person knows what to reuse.
        </p>
      ) : (
        <ol className="space-y-2">
          {task.outcomes.map((o) => (
            <li
              key={o.id}
              id={`outcome-${o.id}`}
              ref={o.id === focusOutcomeId ? focusRef : undefined}
              className={`rounded-lg border p-3 ${
                o.id === focusOutcomeId ? 'border-brand ring-2 ring-brand/40' : 'border-line'
              } ${o.result === 'success' ? 'border-l-4 border-l-due-safe' : 'border-l-4 border-l-due-overdue'}`}
            >
              {editingId === o.id ? (
                <EditOutcome task={task} outcome={o} onDone={() => setEditingId(null)} onSaved={onChanged} />
              ) : (
                <OutcomeView task={task} outcome={o} onEdit={() => setEditingId(o.id)} onChanged={onChanged} />
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function OutcomeView({ task, outcome: o, onEdit, onChanged }: { task: BoardTask; outcome: TaskOutcome; onEdit: () => void; onChanged: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove() {
    if (!confirm('Delete this outcome? This can’t be undone.')) return;
    startTransition(async () => {
      const r = await deleteOutcome(o.id, task.projectId);
      if (r.ok) onChanged();
      else setError(r.error);
    });
  }

  return (
    <div className="text-[13px]">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <ResultBadge result={o.result} />
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-fg-muted">{outcomeSubjectLabel(task, o)}</span>
        <span className="ml-auto flex gap-1">
          <button type="button" onClick={onEdit} className={`${btn.ghost} !h-7 !px-2`} aria-label="Edit this outcome">
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Edit
          </button>
          <button type="button" onClick={remove} disabled={pending} className={`${btn.danger} !h-7 !px-2`} aria-label="Delete this outcome">
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </span>
      </div>
      <p className="mt-1.5 whitespace-pre-wrap text-fg">{o.reason}</p>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-fg-subtle">
        {o.source === 'ai' && <Bot className="h-3 w-3" aria-hidden />}
        <span>
          {o.recordedBy} · {ago(o.createdAt)}
          {o.updatedAt !== o.createdAt && ' · edited'}
        </span>
      </p>
      {o.source === 'ai' && o.operatorInstruction && (
        <p className="mt-1 text-[11px] text-fg-subtle">
          Recorded by an AI because a person asked: <q className="italic">{o.operatorInstruction}</q>
        </p>
      )}
      {o.contextSnapshot && (
        <details className="mt-1.5">
          <summary className="cursor-pointer text-[12px] text-brand-ink">Context as it was then</summary>
          <pre tabIndex={0} className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded border border-line bg-muted p-2 font-mono text-[11px] leading-5 text-fg-muted">
            {o.contextSnapshot}
          </pre>
        </details>
      )}
      {error && (
        <p role="alert" className="mt-1 text-[12px] text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

function ResultChoice({ name, value, onChange }: { name: string; value: OutcomeResult; onChange: (r: OutcomeResult) => void }) {
  return (
    <fieldset>
      <legend className={fieldLabel}>Result</legend>
      <div className="mt-1.5 flex gap-2">
        {OUTCOME_RESULTS.map((r) => (
          <label
            key={r.id}
            className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[13px] ${
              value === r.id ? 'border-brand bg-brand-soft text-fg' : 'border-line-strong text-fg-muted hover:bg-hover'
            }`}
          >
            <input type="radio" name={name} className="accent-brand" checked={value === r.id} onChange={() => onChange(r.id)} />
            {r.id === 'success' ? <CheckCircle2 className="h-3.5 w-3.5 text-ink-safe" aria-hidden /> : <XCircle className="h-3.5 w-3.5 text-ink-overdue" aria-hidden />}
            {r.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ReasonField({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className={fieldLabel}>
        Why? <span className="font-normal text-fg-subtle">(what worked, or what went wrong)</span>
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={REASON_MAX}
        required
        placeholder="e.g. The constraints section stopped it touching the payments code, and the tests passed first time."
        className={`${field} min-h-[5rem]`}
      />
    </div>
  );
}

function OutcomeForm({ task, onDone, onSaved }: { task: BoardTask; onDone: () => void; onSaved: () => void }) {
  const contextReady = hasContext(task.context);
  const [subject, setSubject] = useState<OutcomeSubject>(contextReady || task.prompts.length === 0 ? 'context' : 'prompt');
  const [promptId, setPromptId] = useState(task.prompts[0]?.id ?? '');
  const [result, setResult] = useState<OutcomeResult>('success');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const nothingToRate = !contextReady && task.prompts.length === 0;

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await recordOutcome(task.id, task.projectId, { subject, promptId: subject === 'prompt' ? promptId : null, result, reason });
      if (!r.ok) return setError(r.error);
      onSaved();
      onDone();
    });
  }

  if (nothingToRate) {
    return (
      <div className="mb-3 rounded-lg border border-line bg-surface p-3 text-[13px] text-fg-muted">
        Add some context (Edit) or log a prompt first, then record how it went.{' '}
        <button type="button" onClick={onDone} className="font-medium text-brand-ink hover:underline">
          OK
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="mb-4 space-y-3 rounded-lg border border-line bg-surface p-3">
      <fieldset>
        <legend className={fieldLabel}>What are you rating?</legend>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px]">
          <label className={`flex items-center gap-1.5 ${contextReady ? 'text-fg' : 'text-fg-subtle'}`}>
            <input type="radio" name="outcome-subject" className="accent-brand" disabled={!contextReady} checked={subject === 'context'} onChange={() => setSubject('context')} />
            The task&apos;s current context{!contextReady && ' (none yet)'}
          </label>
          <label className={`flex items-center gap-1.5 ${task.prompts.length ? 'text-fg' : 'text-fg-subtle'}`}>
            <input type="radio" name="outcome-subject" className="accent-brand" disabled={!task.prompts.length} checked={subject === 'prompt'} onChange={() => setSubject('prompt')} />
            A prompt{!task.prompts.length && ' (none logged)'}
          </label>
        </div>
        {subject === 'prompt' && (
          <select value={promptId} onChange={(e) => setPromptId(e.target.value)} className={field} aria-label="Which prompt">
            {task.prompts.map((p, i) => (
              <option key={p.id} value={p.id}>
                #{task.prompts.length - i}
                {p.tool ? ` · ${p.tool}` : ''} · {p.prompt.replace(/\s+/g, ' ').slice(0, 70)}
                {p.prompt.length > 70 ? '…' : ''}
              </option>
            ))}
          </select>
        )}
      </fieldset>
      <ResultChoice name="outcome-result-new" value={result} onChange={setResult} />
      <ReasonField id={`outcome-reason-${task.id}`} value={reason} onChange={(v) => { setReason(v); setError(null); }} />
      {error && (
        <p role="alert" className="text-[13px] text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className={btn.ghost}>
          Cancel
        </button>
        <button type="submit" disabled={pending || !reason.trim()} className={btn.primary}>
          {pending ? 'Saving…' : 'Save outcome'}
        </button>
      </div>
    </form>
  );
}

function EditOutcome({ task, outcome, onDone, onSaved }: { task: BoardTask; outcome: TaskOutcome; onDone: () => void; onSaved: () => void }) {
  const [result, setResult] = useState<OutcomeResult>(outcome.result);
  const [reason, setReason] = useState(outcome.reason);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await updateOutcome(outcome.id, task.projectId, { result, reason });
      if (!r.ok) return setError(r.error);
      onSaved();
      onDone();
    });
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <p className="text-[12px] text-fg-subtle">
        Editing the outcome for <span className="font-mono">{outcomeSubjectLabel(task, outcome)}</span>
      </p>
      <ResultChoice name={`outcome-result-${outcome.id}`} value={result} onChange={setResult} />
      <ReasonField id={`outcome-reason-${outcome.id}`} value={reason} onChange={(v) => { setReason(v); setError(null); }} />
      {error && (
        <p role="alert" className="text-[13px] text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className={btn.ghost}>
          Cancel
        </button>
        <button type="submit" disabled={pending || !reason.trim()} className={btn.primary}>
          {pending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
