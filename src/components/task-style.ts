import { AlarmClock, Bug, CalendarClock, CheckCircle2, Clock, Sparkles, type LucideIcon } from 'lucide-react';
import type { DueState } from '@/lib/due';
import type { Status, TaskType } from '@/lib/types';

// Ticket colour coding, shared by the card and the details modal (DESIGN.md §2).

// Type = left stripe + chip + icon.
export const TYPE_STYLE: Record<TaskType, { label: string; Icon: LucideIcon; stripe: string; icon: string; chip: string }> = {
  feature: {
    label: 'Feature',
    Icon: Sparkles,
    stripe: 'border-l-feature',
    icon: 'text-feature dark:text-indigo-400',
    chip: 'border-feature/30 text-indigo-700 dark:border-indigo-400/40 dark:text-indigo-300',
  },
  bug: {
    label: 'Bug',
    Icon: Bug,
    stripe: 'border-l-bug',
    icon: 'text-bug dark:text-red-400',
    chip: 'border-bug/30 text-red-700 dark:border-red-400/40 dark:text-red-300',
  },
};

// Due-date urgency = card tint + border + due chip (traffic light; Done drops to grey).
export const DUE_STYLE: Record<DueState, { card: string; chip: string; Icon: LucideIcon }> = {
  safe: {
    card: 'border-green-200 bg-green-50/60 dark:border-green-500/25 dark:bg-green-500/[0.06]',
    chip: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300',
    Icon: CalendarClock,
  },
  warning: {
    card: 'border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/[0.08]',
    chip: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    Icon: Clock,
  },
  overdue: {
    card: 'border-red-300 bg-red-50 dark:border-red-500/45 dark:bg-red-500/[0.08]',
    chip: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
    Icon: AlarmClock,
  },
  neutral: {
    card: 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40',
    chip: 'bg-slate-200/70 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300',
    Icon: CheckCircle2,
  },
  none: {
    card: 'border-slate-200 bg-surface-card dark:border-slate-700/70 dark:bg-surface-card-dark',
    chip: 'bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400',
    Icon: CalendarClock,
  },
};

export const STAGE_DOT: Record<Status, string> = {
  todo: 'bg-stage-todo',
  'in-progress': 'bg-stage-progress',
  review: 'bg-stage-review',
  done: 'bg-stage-done',
};

export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
