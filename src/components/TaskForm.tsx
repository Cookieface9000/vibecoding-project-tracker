'use client';

import { MessageSquareText, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { createTask, deleteTask, updateTask } from '@/app/actions';
import { CONTEXT_TEMPLATE, formatBriefing, hasContext } from '@/lib/context';
import {
  CONTEXT_TOOLS,
  STAGES,
  TASK_TYPES,
  type BoardTask,
  type ContextTool,
  type Label,
  type Member,
  type Status,
  type TaskInput,
  type TaskType,
} from '@/lib/types';
import CopyButton from './CopyButton';
import { ModalHeader, btn, field, fieldLabel } from './Modal';
import { LABEL_STYLE, STAGE_DOT, TYPE_STYLE } from './task-style';

const labelCls = fieldLabel;

// Create or edit a task. Assignee and label come from the placeholder lists in the DB.
export default function TaskForm({
  projectId,
  projectCode,
  members,
  labels,
  allTasks = [],
  task,
  defaultStatus = 'todo',
  onDone,
  onCancel,
}: {
  projectId: string;
  projectCode: string;
  members: Member[];
  labels: Label[];
  allTasks?: BoardTask[];
  task?: BoardTask;
  defaultStatus?: Status;
  onDone: () => void;
  onCancel: () => void;
}) {
  const editing = Boolean(task);
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [type, setType] = useState<TaskType>(task?.type ?? 'feature');
  const [status, setStatus] = useState<Status>(task?.status ?? defaultStatus);
  const [assignee, setAssignee] = useState(task?.assignee ?? members[0]?.name ?? '');
  const [labelId, setLabelId] = useState(task?.labelId ?? '');
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '');
  const [dueTime, setDueTime] = useState(task?.dueTime ?? '');
  const [context, setContext] = useState(task ? task.context || CONTEXT_TEMPLATE : CONTEXT_TEMPLATE);
  const [contextTool, setContextTool] = useState<ContextTool | ''>(task?.contextTool ?? '');
  const [dependsOn, setDependsOn] = useState<string[]>(task?.dependsOn ?? []);
  const otherTasks = allTasks.filter((t) => t.id !== task?.id);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const selectedLabel = labels.find((l) => l.id === labelId);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input: TaskInput = {
      projectId,
      title,
      description,
      type,
      status,
      assignee,
      labelId: labelId || null,
      dueDate: dueDate || null,
      dueTime: dueDate && dueTime ? dueTime : null,
      // An untouched template counts as "no context", so the card shows no indicator.
      context: hasContext(context) ? context.trim() : '',
      contextTool: contextTool || null,
    };
    startTransition(async () => {
      const result = task ? await updateTask(task.id, input, dependsOn) : await createTask(input, dependsOn);
      if (result.ok) onDone();
      else setError(result.error);
    });
  }

  function remove() {
    if (!task) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteTask(task.id, projectId);
      if (result.ok) onDone();
      else setError(result.error);
    });
  }

  const titleId = editing ? `edit-task-${task!.id}` : 'new-task';

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-col">
      <ModalHeader
        id={titleId}
        eyebrow={<span className="font-mono text-fg-subtle">#{projectCode}</span>}
        title={editing ? 'Edit task' : 'New task'}
        onClose={onCancel}
      />

      <div className="space-y-5 overflow-y-auto px-6 py-5">
        {error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </p>
        )}

        <div>
          <label htmlFor="task-title" className={labelCls}>
            Title <span className="text-red-600">*</span>
          </label>
          <input
            id="task-title"
            required
            maxLength={200}
            data-autofocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Add rate limiting to /login"
            className={field}
          />
        </div>

        <div>
          <label htmlFor="task-description" className={labelCls}>
            Description
          </label>
          <textarea
            id="task-description"
            rows={2}
            maxLength={5000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What needs to happen, and why?"
            className={field}
          />
        </div>

        <div className="grid grid-cols-2 gap-x-5 gap-y-5">
          <fieldset>
            <legend className={labelCls}>Type</legend>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {TASK_TYPES.map((t) => {
                const s = TYPE_STYLE[t];
                const selected = type === t;
                return (
                  <label
                    key={t}
                    className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand ${
                      selected
                        ? `${s.chip} border-current bg-surface`
                        : 'border-line-strong text-fg-subtle hover:bg-hover'
                    }`}
                  >
                    <input type="radio" name="type" value={t} checked={selected} onChange={() => setType(t)} className="sr-only" />
                    <s.Icon className="h-4 w-4" aria-hidden />
                    {s.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div>
            <label htmlFor="task-status" className={labelCls}>
              Status
            </label>
            <select id="task-status" value={status} onChange={(e) => setStatus(e.target.value as Status)} className={field}>
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="task-assignee" className={labelCls}>
              Assignee
            </label>
            <select id="task-assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)} className={field}>
              {members.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="task-label" className={labelCls}>
              Colour label
            </label>
            <div className="relative">
              {selectedLabel && (
                <span
                  className={`pointer-events-none absolute left-3 top-1/2 mt-[3px] h-2.5 w-2.5 -translate-y-1/2 rounded-full ${LABEL_STYLE[selectedLabel.color].dot}`}
                  aria-hidden
                />
              )}
              <select
                id="task-label"
                value={labelId}
                onChange={(e) => setLabelId(e.target.value)}
                className={`${field} ${selectedLabel ? 'pl-7' : ''}`}
              >
                <option value="">No label</option>
                {labels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.color})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="task-due" className={labelCls}>
              Due date
            </label>
            <input id="task-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={field} />
          </div>

          <div>
            <label htmlFor="task-due-time" className={labelCls}>
              Due time <span className="normal-case tracking-normal text-fg-subtle">(optional)</span>
            </label>
            <input
              id="task-due-time"
              type="time"
              value={dueTime}
              disabled={!dueDate}
              onChange={(e) => setDueTime(e.target.value)}
              aria-describedby="task-due-time-hint"
              className={field}
            />
            <p id="task-due-time-hint" className="mt-1 text-xs text-fg-subtle">
              {dueDate ? 'Blank = end of day' : 'Set a date first'}
            </p>
          </div>
        </div>

        {/* Blockers: tasks that must finish first. Cycles are rejected on save. */}
        {otherTasks.length > 0 && (
          <fieldset>
            <legend className={labelCls}>
              Blockers <span className="font-normal text-fg-subtle">(optional)</span>
            </legend>
            <ul className="mt-1.5 max-h-40 divide-y divide-line overflow-y-auto border border-line-strong">
              {otherTasks.map((t) => {
                const checked = dependsOn.includes(t.id);
                return (
                  <li key={t.id}>
                    <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-hover has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setDependsOn((d) => (checked ? d.filter((x) => x !== t.id) : [...d, t.id]))}
                        className="h-3.5 w-3.5 accent-brand"
                      />
                      <span className={'h-2 w-2 shrink-0 rounded-full ' + STAGE_DOT[t.status]} aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-fg">{t.title}</span>
                      <span className="shrink-0 text-[11px] text-fg-subtle">{STAGES.find((st) => st.id === t.status)?.label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        )}

        {/* AI context: paste-ready briefing for the next AI tool or teammate. */}
        <section className="rounded-lg border border-line p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="task-context" className={`${labelCls} flex items-center gap-1.5`}>
              <MessageSquareText className="h-3.5 w-3.5" aria-hidden />
              Context <span className="normal-case tracking-normal text-fg-subtle">(Markdown)</span>
            </label>
            <CopyButton getText={() => formatBriefing({ title, description, context }, projectCode)} label="Copy context" />
          </div>
          <textarea
            id="task-context"
            rows={8}
            maxLength={20000}
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className={`${field} font-mono text-xs leading-5`}
            aria-describedby="task-context-hint"
          />
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <p id="task-context-hint" className="max-w-xs text-xs text-fg-subtle">
              Copies title, description and context as one Markdown briefing, ready to paste into any AI chat.
            </p>
            <div className="w-40">
              <label htmlFor="task-context-tool" className={labelCls}>
                AI tool
              </label>
              <select
                id="task-context-tool"
                value={contextTool}
                onChange={(e) => setContextTool(e.target.value as ContextTool | '')}
                className={field}
              >
                <option value="">None</option>
                {CONTEXT_TOOLS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-6 py-4">
        <div>
          {editing &&
            (confirmingDelete ? (
              <span className="flex items-center gap-2">
                <span className="text-sm text-fg-muted">Delete this task? This can&apos;t be undone.</span>
                <button type="button" onClick={remove} disabled={pending} className={btn.dangerSolid}>
                  Delete
                </button>
                <button type="button" onClick={() => setConfirmingDelete(false)} disabled={pending} className={btn.secondary}>
                  Keep
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmingDelete(true)} disabled={pending} className={btn.danger}>
                <Trash2 className="h-4 w-4" aria-hidden />
                Delete task
              </button>
            ))}
        </div>
        {!confirmingDelete && (
          <div className="flex items-center gap-3">
            <button type="button" onClick={onCancel} disabled={pending} className={btn.secondary}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className={btn.primary}>
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Create task'}
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
