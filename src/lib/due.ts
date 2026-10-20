import type { Task } from './types';

// Due-date urgency. Pure: derives urgency from dueDate (+ optional dueTime) and status.
export type DueState = 'safe' | 'warning' | 'overdue' | 'neutral' | 'none';

type DueFields = Pick<Task, 'dueDate' | 'dueTime' | 'status'>;

const DAY_MS = 24 * 60 * 60 * 1000;

/** When the task is due: its time on the due date, or the end of that day. */
function dueAt(task: DueFields): Date {
  return new Date(`${task.dueDate}T${task.dueTime ?? '23:59'}:${task.dueTime ? '00' : '59'}`);
}

export function dueState(task: DueFields, now = new Date()): DueState {
  if (task.status === 'done') return 'neutral';
  if (!task.dueDate) return 'none';
  const msLeft = dueAt(task).getTime() - now.getTime();
  if (msLeft < 0) return 'overdue';
  if (msLeft < DAY_MS) return 'warning';
  return 'safe';
}

export function dueLabel(task: DueFields, now = new Date()): string | null {
  const state = dueState(task, now);
  if (state === 'neutral') return 'Completed';
  if (state === 'none') return null;

  // Whole calendar days between today and the due date.
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const [y, m, d] = task.dueDate!.split('-').map(Number);
  const days = Math.round((Date.UTC(y, m - 1, d) - today) / DAY_MS);
  const at = task.dueTime ? ` ${task.dueTime}` : '';

  if (state === 'overdue') {
    if (days >= 0) return 'Overdue';
    const n = -days;
    return `${n} ${n === 1 ? 'day' : 'days'} overdue`;
  }
  if (days === 0) return `Due today${at}`;
  if (days === 1) return `Due tomorrow${at}`;
  return `${days} days left`;
}
