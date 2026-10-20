'use client';

import { useDraggable } from '@dnd-kit/core';
import { dueLabel, dueState } from '@/lib/due';
import type { BoardTask } from '@/lib/types';
import { DUE_STYLE, TYPE_STYLE, initials } from './task-style';

// Compact, fixed-height ticket: title (max 2 lines) + one meta row.
export function TaskCardBody({ task, lifted = false }: { task: BoardTask; lifted?: boolean }) {
  const type = TYPE_STYLE[task.type];
  const due = DUE_STYLE[dueState(task)];
  const label = dueLabel(task);
  const done = task.status === 'done';

  return (
    <div
      className={`flex h-[88px] w-full flex-col justify-between rounded-md border border-l-[3px] px-3 py-2.5 text-left ${due.card} ${type.stripe} ${
        lifted ? 'rotate-[1.5deg] shadow-xl ring-2 ring-brand/40' : 'shadow-[0_1px_2px_rgba(15,23,42,0.05)] group-hover:shadow-md'
      }`}
    >
      <span
        className={`line-clamp-2 text-sm font-medium leading-5 ${done ? 'text-slate-500 line-through decoration-slate-400/60 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}
      >
        {task.title}
      </span>

      <span className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <type.Icon className={`h-3.5 w-3.5 shrink-0 ${type.icon}`} aria-label={type.label} />
          {label && (
            <span className={`inline-flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-[11px] font-medium ${due.chip}`}>
              <due.Icon className="h-3 w-3 shrink-0" aria-hidden />
              {label}
            </span>
          )}
        </span>
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200"
          title={`Assigned to ${task.assignee}`}
        >
          {initials(task.assignee)}
        </span>
      </span>
    </div>
  );
}

// Click / Enter opens the ticket; drag (or Space, arrows, Space) moves it between columns.
export default function TaskCard({ task, onOpen }: { task: BoardTask; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, data: { status: task.status } });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onOpen();
          return;
        }
        listeners?.onKeyDown?.(e);
      }}
      aria-label={`${task.title}. Press Enter to open, Space to move.`}
      className={`group cursor-grab touch-none rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 active:cursor-grabbing ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <TaskCardBody task={task} />
    </div>
  );
}
