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
      <div className="border-b border-slate-200 px-6 py-3 dark:border-slate-700">
        <label htmlFor="pick-search" className="sr-only">
          Search tasks
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            id="pick-search"
            data-autofocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title…"
            className="block w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      <div className="overflow-y-auto px-3 py-3">
        {STAGES.map((stage) => {
          const group = matches.filter((t) => t.status === stage.id);
          if (group.length === 0) return null;
          return (
            <section key={stage.id} aria-label={stage.label} className="mb-3 last:mb-0">
              <h3 className="flex items-center gap-2 px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
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
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 dark:hover:bg-slate-800"
                      >
                        <type.Icon className={`h-4 w-4 shrink-0 ${type.icon}`} aria-label={type.label} />
                        <span className="min-w-0 flex-1 truncate font-medium text-slate-900 dark:text-slate-100">{task.title}</span>
                        {hasContext(task.context) && (
                          <MessageSquareText className="h-4 w-4 shrink-0 text-brand dark:text-brand-dark" aria-label="Has AI context" />
                        )}
                        {label && (
                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${LABEL_STYLE[label.color].chip}`}>
                            {label.name}
                          </span>
                        )}
                        <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{task.assignee}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        {matches.length === 0 && <p className="px-3 py-6 text-center text-sm text-slate-400">No tasks match “{query}”.</p>}
      </div>

      <div className="flex justify-end border-t border-slate-200 px-6 py-4 dark:border-slate-700">
        <button type="button" onClick={onClose} className={btn.secondary}>
          Close
        </button>
      </div>
    </>
  );
}
