'use client';

import { ChevronRight, MessageSquareText, Search } from 'lucide-react';
import { useState } from 'react';
import { hasContext } from '@/lib/context';
import { STAGES, type BoardTask, type Label } from '@/lib/types';
import { ModalHeader, btn } from './Modal';
import { LABEL_STYLE, STAGE_DOT, TYPE_STYLE } from './task-style';

// "Edit task": choose which task to change, then edit and save it.
export default function EditPicker({
  tasks,
  labelOf,
  onPick,
  onClose,
}: {
  tasks: BoardTask[];
  labelOf: (task: BoardTask) => Label | undefined;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const matches = q ? tasks.filter((t) => t.title.toLowerCase().includes(q)) : tasks;

  return (
    <>
      <ModalHeader id="pick-task" title="Edit a task" onClose={onClose} />
      <div className="border-b border-line px-6 py-3">
        <label htmlFor="pick-search" className="sr-only">
          Search tasks
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <input
            id="pick-search"
            data-autofocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title…"
            className="block w-full rounded-lg border border-line-strong bg-surface py-2 pl-9 pr-3 text-sm text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
      </div>

      <div className="overflow-y-auto px-3 py-3">
        {STAGES.map((stage) => {
          const group = matches.filter((t) => t.status === stage.id);
          if (group.length === 0) return null;
          return (
            <section key={stage.id} aria-label={stage.label} className="mb-3 last:mb-0">
              <h3 className="flex items-center gap-2 px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                <span className={`h-2 w-2 rounded-full ${STAGE_DOT[stage.id]}`} aria-hidden />
                {stage.label}
              </h3>
              <ul>
                {group.map((task) => {
                  const type = TYPE_STYLE[task.type];
                  const label = labelOf(task);
                  return (
                    <li key={task.id}>
                      <button
                        type="button"
                        onClick={() => onPick(task.id)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        <type.Icon className={`h-4 w-4 shrink-0 ${type.icon}`} aria-label={type.label} />
                        <span className="min-w-0 flex-1 truncate font-medium text-fg">{task.title}</span>
                        {hasContext(task.context) && (
                          <MessageSquareText className="h-4 w-4 shrink-0 text-brand-ink" aria-label="Has AI context" />
                        )}
                        {label && (
                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${LABEL_STYLE[label.color].chip}`}>
                            {label.name}
                          </span>
                        )}
                        <span className="shrink-0 text-xs text-fg-subtle">{task.assignee}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        {matches.length === 0 && <p className="px-3 py-6 text-center text-sm text-fg-subtle">No tasks match “{query}”.</p>}
      </div>

      <div className="flex justify-end border-t border-line px-6 py-4">
        <button type="button" onClick={onClose} className={btn.secondary}>
          Close
        </button>
      </div>
    </>
  );
}
