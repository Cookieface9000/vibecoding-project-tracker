'use client';

import { Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { createTask, deleteTask, updateTask } from '@/app/actions';
import { STAGES, TASK_TYPES, TEAM, type BoardTask, type Status, type TaskInput, type TaskType } from '@/lib/types';
import { ModalHeader, btn } from './Modal';
import { TYPE_STYLE } from './task-style';

const field =
  'mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-brand-dark';
const labelCls = 'block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400';

// Create or edit a task. Context fields are carried through unchanged.
export default function TaskForm({
  projectId,
  projectCode,
  task,
  defaultStatus = 'todo',
  onDone,
  onCancel,
}: {
  projectId: string;
  projectCode: string;
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
  const [assignee, setAssignee] = useState(task?.assignee ?? TEAM[0]);
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '');
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();

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
      dueDate: dueDate || null,
      context: task?.context ?? '',
      contextTool: task?.contextTool ?? null,
    };
    startTransition(async () => {
      const result = task ? await updateTask(task.id, input) : await createTask(input);
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
        eyebrow={<span className="font-mono text-slate-500 dark:text-slate-400">#{projectCode}</span>}
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
            rows={3}
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
                    className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40 ${
                      selected
                        ? `${s.chip} border-current bg-white dark:bg-slate-900`
                        : 'border-slate-300 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
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
              {TEAM.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="task-due" className={labelCls}>
              Due date
            </label>
            <input id="task-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={field} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
        <div>
          {editing &&
            (confirmingDelete ? (
              <span className="flex items-center gap-2">
                <span className="text-sm text-slate-600 dark:text-slate-300">Delete this task? This can&apos;t be undone.</span>
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
