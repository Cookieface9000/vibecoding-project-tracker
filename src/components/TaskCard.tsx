import { dueLabel, dueState } from '@/lib/due';
import type { BoardTask } from '@/lib/types';
import TaskDialog from './TaskDialog';
import { DUE_STYLE, TYPE_STYLE, initials } from './task-style';

// Compact, fixed-height ticket: title (max 2 lines) + one meta row.
// Everything else lives in the details modal opened on click.
export default function TaskCard({ task, projectCode }: { task: BoardTask; projectCode: string }) {
  const type = TYPE_STYLE[task.type];
  const state = dueState(task);
  const due = DUE_STYLE[state];
  const label = dueLabel(task);
  const done = task.status === 'done';

  return (
    <TaskDialog task={task} projectCode={projectCode}>
      <span
        className={`flex h-[88px] w-full flex-col justify-between rounded-md border border-l-[3px] px-3 py-2.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-shadow group-hover:shadow-md ${due.card} ${type.stripe}`}
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
      </span>
    </TaskDialog>
  );
}
