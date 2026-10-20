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
    card: '[background-color:color-mix(in_srgb,rgb(var(--c-safe))_var(--tint),rgb(var(--surface)))] [border-color:color-mix(in_srgb,rgb(var(--c-safe))_35%,rgb(var(--line)))]',
    chip: '[background-color:color-mix(in_srgb,rgb(var(--c-safe))_var(--chip-tint),rgb(var(--surface)))] text-ink-safe',
    Icon: CalendarClock,
  },
  warning: {
    card: '[background-color:color-mix(in_srgb,rgb(var(--c-warning))_var(--tint),rgb(var(--surface)))] [border-color:color-mix(in_srgb,rgb(var(--c-warning))_50%,rgb(var(--line)))]',
    chip: '[background-color:color-mix(in_srgb,rgb(var(--c-warning))_var(--chip-tint),rgb(var(--surface)))] text-ink-warning',
    Icon: Clock,
  },
  overdue: {
    card: '[background-color:color-mix(in_srgb,rgb(var(--c-overdue))_var(--tint),rgb(var(--surface)))] [border-color:color-mix(in_srgb,rgb(var(--c-overdue))_45%,rgb(var(--line)))]',
    chip: '[background-color:color-mix(in_srgb,rgb(var(--c-overdue))_var(--chip-tint),rgb(var(--surface)))] text-ink-overdue',
    Icon: AlarmClock,
  },
  neutral: {
    card: 'border-line bg-muted',
    chip: 'bg-muted text-fg-subtle',
    Icon: CheckCircle2,
  },
  none: {
    card: 'border-line bg-surface',
    chip: 'bg-muted text-fg-subtle',
    Icon: CalendarClock,
  },
};

export const STAGE_DOT: Record<Status, string> = {
  todo: 'bg-stage-todo',
  'in-progress': 'bg-stage-progress',
  review: 'bg-stage-review',
  done: 'bg-stage-done',
};

// User-assignable label colours (from the `labels` table): a solid outlined chip
// with a coloured dot, so the name stays readable and nothing is translucent.
export const LABEL_STYLE: Record<LabelColor, { chip: string; dot: string }> = {
  blue: { chip: 'border border-line bg-surface text-fg-muted', dot: 'bg-blue-500' },
  violet: { chip: 'border border-line bg-surface text-fg-muted', dot: 'bg-violet-500' },
  pink: { chip: 'border border-line bg-surface text-fg-muted', dot: 'bg-pink-500' },
  orange: { chip: 'border border-line bg-surface text-fg-muted', dot: 'bg-orange-500' },
  teal: { chip: 'border border-line bg-surface text-fg-muted', dot: 'bg-teal-500' },
  slate: { chip: 'border border-line bg-surface text-fg-muted', dot: 'bg-slate-500' },
};

export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
