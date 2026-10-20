'use client';

import { CalendarDays, History, MessageSquareText, User, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { dueLabel, dueState } from '@/lib/due';
import { STAGES, type BoardTask } from '@/lib/types';
import { DUE_STYLE, STAGE_DOT, TYPE_STYLE, initials } from './task-style';

const dateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return dateFmt.format(new Date(y, m - 1, d));
}

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

// The card is the trigger; the details modal only renders while open.
export default function TaskDialog({
  task,
  projectCode,
  children,
}: {
  task: BoardTask;
  projectCode: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) dialog.showModal();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group block w-full rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
        aria-haspopup="dialog"
      >
        {children}
      </button>

      {open && (
        <dialog
          ref={dialogRef}
          onClose={() => setOpen(false)}
          onClick={(e) => e.target === e.currentTarget && dialogRef.current?.close()}
          aria-labelledby={`task-title-${task.id}`}
          className="m-auto w-[min(42rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-surface-card p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm dark:border-slate-700 dark:bg-surface-card-dark dark:text-slate-100"
        >
          <TaskDetails task={task} projectCode={projectCode} onClose={() => dialogRef.current?.close()} />
        </dialog>
      )}
    </>
  );
}

function TaskDetails({ task, projectCode, onClose }: { task: BoardTask; projectCode: string; onClose: () => void }) {
  const type = TYPE_STYLE[task.type];
  const state = dueState(task);
  const due = DUE_STYLE[state];
  const label = dueLabel(task);
  const stage = STAGES.find((s) => s.id === task.status);

  return (
    <div className="flex max-h-[85vh] flex-col">
      {/* Header */}
      <div className={`flex items-start justify-between gap-4 border-b border-l-4 border-b-slate-200 px-6 py-4 dark:border-b-slate-700 ${type.stripe}`}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono text-slate-500 dark:text-slate-400">#{projectCode}</span>
            <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-medium uppercase tracking-wide ${type.chip}`}>
              <type.Icon className="h-3 w-3" aria-hidden />
              {type.label}
            </span>
          </div>
          <h2 id={`task-title-${task.id}`} className="mt-1.5 font-heading text-xl font-medium leading-snug">
            {task.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-6 overflow-y-auto px-6 py-5">
        {/* Key facts: fixed 2×2 grid so every modal lines up the same way */}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <Fact label="Status">
            <span className="inline-flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${STAGE_DOT[task.status]}`} aria-hidden />
              {stage?.label}
            </span>
          </Fact>
          <Fact label="Assignee" icon={User}>
            <span className="inline-flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                {initials(task.assignee)}
              </span>
              {task.assignee}
            </span>
          </Fact>
          <Fact label="Due date" icon={CalendarDays}>
            {task.dueDate ? (
              <span className="inline-flex flex-wrap items-center gap-2">
                {formatDate(task.dueDate)}
                {label && (
                  <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${due.chip}`}>
                    <due.Icon className="h-3 w-3" aria-hidden />
                    {label}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-slate-400">No due date</span>
            )}
          </Fact>
          <Fact label="Created" icon={CalendarDays}>
            {formatDate(task.createdDate)}
          </Fact>
        </dl>

        {task.description && (
          <Section title="Description">
            <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">{task.description}</p>
          </Section>
        )}

        <Section
          title="Context"
          icon={MessageSquareText}
          aside={
            task.contextUpdatedAt
              ? `${task.contextTool ? `${task.contextTool} · ` : ''}updated ${timeAgo(task.contextUpdatedAt)}`
              : undefined
          }
        >
          {task.context ? (
            <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-mono text-xs leading-5 text-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
              {task.context}
            </pre>
          ) : (
            <Empty>No context yet.</Empty>
          )}
        </Section>

        <Section title="Prompt history" icon={History} aside={task.prompts.length ? `${task.prompts.length} prompts` : undefined}>
          {task.prompts.length === 0 ? (
            <Empty>No prompts logged for this task yet.</Empty>
          ) : (
            <ol className="relative space-y-3 border-l border-slate-200 pl-5 dark:border-slate-700">
              {task.prompts.map((p) => (
                <li key={p.id} className="relative">
                  <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand dark:border-surface-card-dark" aria-hidden />
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    {p.tool && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700 dark:bg-slate-700/60 dark:text-slate-200">
                        {p.tool}
                      </span>
                    )}
                    <time dateTime={p.createdAt} title={dateTimeFmt.format(new Date(p.createdAt))}>
                      {timeAgo(p.createdAt)}
                    </time>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-2.5 font-mono text-xs leading-5 text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
                    {p.prompt}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Section>
      </div>
    </div>
  );
}

function Fact({ label, icon: Icon, children }: { label: string; icon?: typeof User; children: React.ReactNode }) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
        {label}
      </dt>
      <dd className="mt-1 text-slate-900 dark:text-slate-100">{children}</dd>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  aside,
  children,
}: {
  title: string;
  icon?: typeof User;
  aside?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
          {title}
        </h3>
        {aside && <span className="text-xs text-slate-400">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
      {children}
    </p>
  );
}
