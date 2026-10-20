import { AlarmClock, Bug, CalendarClock, CheckCircle2, Clock, MessageSquareText, Sparkles } from 'lucide-react';
import { dueLabel, dueState, type DueState } from '@/lib/due';
import type { Task } from '@/lib/types';

// Task type styling: one definition per type, reused everywhere a task is shown.
export const TYPE_STYLE = {
  feature: {
    label: 'Feature',
    Icon: Sparkles,
    stripe: 'border-l-feature',
    chip: 'bg-feature/10 text-feature ring-feature/30 dark:bg-feature/20 dark:text-indigo-300',
  },
  bug: {
    label: 'Bug',
    Icon: Bug,
    stripe: 'border-l-bug',
    chip: 'bg-bug/10 text-bug ring-bug/30 dark:bg-bug/20 dark:text-red-300',
  },
} as const;

// Due-date urgency: card background + due chip per urgency state.
const DUE_STYLE: Record<DueState, { card: string; chip: string; Icon: typeof Clock }> = {
  safe: {
    card: 'bg-green-50/70 ring-due-safe/25 dark:bg-due-safe/[0.07] dark:ring-due-safe/30',
    chip: 'bg-due-safe/10 text-green-700 dark:bg-due-safe/20 dark:text-green-300',
    Icon: CalendarClock,
  },
  warning: {
    card: 'bg-amber-50 ring-due-warning/50 dark:bg-due-warning/10 dark:ring-due-warning/40',
    chip: 'bg-due-warning/15 text-amber-700 dark:bg-due-warning/20 dark:text-amber-300',
    Icon: Clock,
  },
  overdue: {
    card: 'bg-red-50 ring-due-overdue/50 dark:bg-due-overdue/10 dark:ring-due-overdue/45',
    chip: 'bg-due-overdue/15 text-red-700 dark:bg-due-overdue/20 dark:text-red-300',
    Icon: AlarmClock,
  },
  neutral: {
    card: 'bg-slate-50 ring-slate-200 opacity-80 dark:bg-slate-800/40 dark:ring-slate-700',
    chip: 'bg-slate-200/70 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300',
    Icon: CheckCircle2,
  },
  none: {
    card: 'bg-surface-card ring-slate-200 dark:bg-surface-card-dark dark:ring-slate-700/70',
    chip: '',
    Icon: CalendarClock,
  },
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function TaskCard({ task }: { task: Task }) {
  const type = TYPE_STYLE[task.type];
  const state = dueState(task);
  const due = DUE_STYLE[state];
  const label = dueLabel(task);
  const done = task.status === 'done';

  return (
    <article
      className={`group rounded-xl border-l-[3px] p-3 shadow-sm ring-1 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md ${type.stripe} ${due.card}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3
          className={`text-sm font-semibold leading-snug ${done ? 'text-slate-500 line-through decoration-slate-400/60 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}
        >
          {task.title}
        </h3>
        <type.Icon className={`mt-0.5 h-4 w-4 shrink-0 ${task.type === 'feature' ? 'text-feature' : 'text-bug'}`} aria-hidden />
      </div>

      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{task.description}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {label && (
          <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${due.chip}`}>
            <due.Icon className="h-3 w-3" aria-hidden />
            {label}
          </span>
        )}
        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${type.chip}`}>
          <type.Icon className="h-3 w-3" aria-hidden />
          {type.label}
        </span>
        {task.contextTool && (
          <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
            {task.contextTool}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-900/5 pt-2 dark:border-white/5">
        <span
          className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500"
          title={task.context ? 'Has AI context' : 'No AI context yet'}
        >
          <MessageSquareText className={`h-3.5 w-3.5 ${task.context ? 'text-brand dark:text-brand-dark' : ''}`} aria-hidden />
          {task.context ? 'Context' : 'No context'}
        </span>
        <span className="flex items-center gap-1.5" title={`Assigned to ${task.assignee}`}>
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{task.assignee}</span>
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/15 text-[10px] font-bold text-brand ring-2 ring-white dark:bg-brand-dark/20 dark:text-brand-dark dark:ring-surface-card-dark"
            aria-hidden
          >
            {initials(task.assignee)}
          </span>
        </span>
      </div>
    </article>
  );
}
