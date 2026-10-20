import { AlarmClock, Bug, CalendarClock, CheckCircle2, Clock, Sparkles, type LucideIcon } from 'lucide-react';
import type { DueState } from '@/lib/due';
import type { LabelColor, Status, TaskType } from '@/lib/types';

// Ticket colour coding, shared by the card, details and form (DESIGN.md §2).
// Semantic colours are CSS variables, so Settings → Accessibility can re-map them.

// Type = icon + chip.
export const TYPE_STYLE: Record<TaskType, { label: string; Icon: LucideIcon; icon: string; chip: string }> = {
  feature: {
    label: 'Feature',
    Icon: Sparkles,
    icon: 'text-ink-feature',
    chip: 'border-feature/30 text-ink-feature',
  },
  bug: {
    label: 'Bug',
    Icon: Bug,
    icon: 'text-ink-bug',
    chip: 'border-bug/30 text-ink-bug',
  },
};

// Due-date urgency = card tint + border + due chip (traffic light; Done drops to grey).
export const DUE_STYLE: Record<DueState, { card: string; chip: string; Icon: LucideIcon }> = {
  safe: {
    card: 'border-due-safe/30 bg-due-safe/[0.07] dark:bg-due-safe/[0.08]',
    chip: 'bg-due-safe/15 text-ink-safe',
    Icon: CalendarClock,
  },
  warning: {
    card: 'border-due-warning/50 bg-due-warning/[0.10] dark:bg-due-warning/[0.09]',
    chip: 'bg-due-warning/20 text-ink-warning',
    Icon: Clock,
  },
  overdue: {
    card: 'border-due-overdue/40 bg-due-overdue/[0.08] dark:bg-due-overdue/[0.09]',
    chip: 'bg-due-overdue/15 text-ink-overdue',
    Icon: AlarmClock,
  },
  neutral: {
    card: 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40',
    chip: 'bg-due-neutral/20 text-ink-neutral',
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

// User-assignable label colours (from the `labels` table). Name is always shown too.
export const LABEL_STYLE: Record<LabelColor, { chip: string; dot: string }> = {
  blue: { chip: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300', dot: 'bg-blue-500' },
  violet: { chip: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300', dot: 'bg-violet-500' },
  pink: { chip: 'bg-pink-100 text-pink-800 dark:bg-pink-500/15 dark:text-pink-300', dot: 'bg-pink-500' },
  orange: { chip: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300', dot: 'bg-orange-500' },
  teal: { chip: 'bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300', dot: 'bg-teal-500' },
  slate: { chip: 'bg-slate-200 text-slate-700 dark:bg-slate-600/40 dark:text-slate-200', dot: 'bg-slate-500' },
};

export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
