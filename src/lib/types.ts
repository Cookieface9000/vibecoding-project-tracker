// Shared constants and types. Safe to import from client or server code.

// The four columns of the board, in render order.
// Use these IDs everywhere — do not invent new ones.
export const STAGES = [
  { id: 'todo', label: 'To Do' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
] as const;

export type Status = (typeof STAGES)[number]['id'];

// Solo project: one human assignee. These are the only valid values for `Task.assignee`.
export const TEAM = ['Me'] as const;

export const TASK_TYPES = ['feature', 'bug'] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const CONTEXT_TOOLS = ['Claude', 'ChatGPT', 'Cursor', 'Lovable', 'Replit', 'Other'] as const;
export type ContextTool = (typeof CONTEXT_TOOLS)[number];

export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  status: Status;
  assignee: string;
  dueDate: string | null; // ISO 'YYYY-MM-DD'
  createdDate: string; // ISO 'YYYY-MM-DD'
  // M9
  context: string;
  contextTool: ContextTool | null;
  contextUpdatedAt: string | null; // ISO timestamp
}

export type TaskInput = Omit<Task, 'id' | 'createdDate' | 'contextUpdatedAt'>;

export const DELIVERABLES = ['presentation', 'demo', 'report', 'documentation'] as const;
export type DeliverableKind = (typeof DELIVERABLES)[number];
export type Deliverables = Record<DeliverableKind, string>;
