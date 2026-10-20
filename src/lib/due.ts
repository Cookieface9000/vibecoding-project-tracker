import type { Task } from './types';

// Due-date urgency. Pure: derives urgency from the existing dueDate + status.
export type DueState = 'safe' | 'warning' | 'overdue' | 'neutral' | 'none';

const DAY_MS = 24 * 60 * 60 * 1000;

export function dueState(task: Pick<Task, 'dueDate' | 'status'>, now = new Date()): DueState {
  if (task.status === 'done') return 'neutral';
  if (!task.dueDate) return 'none';
  // A task due on a date is due by the end of that day.
  const msLeft = new Date(`${task.dueDate}T23:59:59`).getTime() - now.getTime();
  if (msLeft < 0) return 'overdue';
  if (msLeft < DAY_MS) return 'warning';
  return 'safe';
}

export function dueLabel(task: Pick<Task, 'dueDate' | 'status'>, now = new Date()): string | null {
  const state = dueState(task, now);
  if (state === 'neutral') return 'Completed';
  if (state === 'none') return null;
  if (state === 'warning') return 'Due today';

  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const [y, m, d] = task.dueDate!.split('-').map(Number);
  const days = Math.round((Date.UTC(y, m - 1, d) - today) / DAY_MS);
  const n = Math.abs(days);
  const unit = n === 1 ? 'day' : 'days';
  return state === 'overdue' ? `${n} ${unit} overdue` : `${n} ${unit} left`;
}
