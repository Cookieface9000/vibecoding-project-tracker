'use client';

import { Lock, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { isLinkBlocking } from '@/lib/blocking';
import { STAGES, type BoardTask } from '@/lib/types';
import { btn, field } from './ui';
import { STAGE_DOT } from './task-style';

export interface BlockerControls {
  busy: boolean;
  onAdd: (blockerId: string) => void;
  onCreate: (title: string) => void;
  onToggle: (blockerId: string, active: boolean) => void;
  onRemove: (blockerId: string) => void;
}

// "Blocked by", managed from inside the task: add an existing task or create a new one as a
// blocker, and choose which blockers are active (inactive ones are kept but don't block).
export default function BlockerManager({
  task,
  allTasks,
  onOpenTask,
  controls,
}: {
  task: BoardTask;
  allTasks: BoardTask[];
  onOpenTask: (id: string) => void;
  controls: BlockerControls;
}) {
  const [pick, setPick] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const byId = new Map(allTasks.map((t) => [t.id, t]));
  const links = task.blockers.filter((b) => byId.has(b.taskId));
  // Candidates: other tasks not already linked and not waiting on this task directly.
  const candidates = allTasks.filter(
    (t) => t.id !== task.id && !task.dependsOn.includes(t.id) && !t.dependsOn.includes(task.id),
  );

  return (
    <div>
      <p className="mb-1.5 text-[12px] font-medium text-fg-muted">Blocked by</p>

      {links.length === 0 ? (
        <p className="mb-3 text-[13px] text-fg-subtle">Nothing is blocking this task.</p>
      ) : (
        <ul className="mb-3 divide-y divide-line border border-line">
          {links.map((link) => {
            const blocker = byId.get(link.taskId)!;
            const blocking = isLinkBlocking(link, byId);
            const done = blocker.status === 'done';
            const switchId = `blocker-active-${task.id}-${blocker.id}`;
            return (
              <li key={link.taskId} className={`flex items-center gap-3 px-3 py-2 ${blocking ? 'bg-[color-mix(in_srgb,rgb(var(--c-overdue))_6%,rgb(var(--raised)))]' : ''}`}>
                <button
                  type="button"
                  onClick={() => onOpenTask(blocker.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left text-[13px] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${STAGE_DOT[blocker.status]}`} aria-hidden />
                  <span className={`truncate ${link.active ? 'text-fg' : 'text-fg-subtle line-through decoration-fg-subtle/50'}`}>{blocker.title}</span>
                  <span className="shrink-0 text-[11px] text-fg-subtle">{STAGES.find((s) => s.id === blocker.status)?.label}</span>
                </button>

                {/* Status text, so the state isn't colour-only */}
                <span className={`hidden w-20 shrink-0 items-center gap-1 text-[11px] font-medium sm:inline-flex ${blocking ? 'text-ink-overdue' : 'text-fg-subtle'}`}>
                  {blocking && <Lock className="h-3 w-3" aria-hidden />}
                  {blocking ? 'Blocking' : done ? 'Done' : link.active ? 'Active' : 'Not active'}
                </span>

                {/* Active switch */}
                <label htmlFor={switchId} className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[12px] text-fg-muted">
                  <button
                    id={switchId}
                    type="button"
                    role="switch"
                    aria-checked={link.active}
                    aria-label={`${blocker.title} is an active blocker`}
                    disabled={controls.busy}
                    onClick={() => controls.onToggle(blocker.id, !link.active)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50 ${
                      link.active ? 'bg-brand' : 'bg-line-strong'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${link.active ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                  </button>
                  Active
                </label>

                <button
                  type="button"
                  onClick={() => controls.onRemove(blocker.id)}
                  disabled={controls.busy}
                  aria-label={`Remove ${blocker.title} as a blocker`}
                  title="Remove blocker"
                  className="shrink-0 rounded p-1 text-fg-subtle hover:bg-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Add blockers: an existing task, or create a new one. */}
      <div className="grid gap-3 border border-dashed border-line-strong p-3 sm:grid-cols-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (pick) {
              controls.onAdd(pick);
              setPick('');
            }
          }}
        >
          <label htmlFor={`add-blocker-${task.id}`} className="block text-[12px] font-medium text-fg-muted">
            Add an existing task
          </label>
          <div className="mt-1.5 flex gap-2">
            <select
              id={`add-blocker-${task.id}`}
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              disabled={candidates.length === 0}
              className={`${field} !mt-0 min-w-0 flex-1`}
            >
              <option value="">{candidates.length ? 'Choose a task…' : 'No other tasks'}</option>
              {STAGES.map((stage) => {
                const group = candidates.filter((t) => t.status === stage.id);
                return group.length ? (
                  <optgroup key={stage.id} label={stage.label}>
                    {group.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </optgroup>
                ) : null;
              })}
            </select>
            <button type="submit" disabled={!pick || controls.busy} className={btn.secondary}>
              Add
            </button>
          </div>
        </form>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newTitle.trim()) {
              controls.onCreate(newTitle);
              setNewTitle('');
            }
          }}
        >
          <label htmlFor={`new-blocker-${task.id}`} className="block text-[12px] font-medium text-fg-muted">
            Or create a new blocker
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              id={`new-blocker-${task.id}`}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              maxLength={200}
              placeholder="e.g. Get API keys from vendor"
              className={`${field} !mt-0 min-w-0 flex-1`}
            />
            <button type="submit" disabled={!newTitle.trim() || controls.busy} className={btn.primary}>
              <Plus className="h-4 w-4" aria-hidden />
              Create
            </button>
          </div>
          <p className="mt-1 text-[11px] text-fg-subtle">Added to To Do and set as an active blocker.</p>
        </form>
      </div>
    </div>
  );
}
