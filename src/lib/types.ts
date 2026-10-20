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

/** Someone a task can be assigned to (placeholder list in the `members` table). */
export interface Member {
  id: string;
  name: string;
}

export const LABEL_COLORS = ['blue', 'violet', 'pink', 'orange', 'teal', 'slate'] as const;
export type LabelColor = (typeof LABEL_COLORS)[number];

/** A colour label from the `labels` table. */
export interface Label {
  id: string;
  name: string;
  color: LabelColor;
}

export const TASK_TYPES = ['feature', 'bug'] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const CONTEXT_TOOLS = ['Claude', 'ChatGPT', 'Cursor', 'Lovable', 'Replit', 'Other'] as const;
export type ContextTool = (typeof CONTEXT_TOOLS)[number];

export const PROJECT_STATUSES = [
  { id: 'active', label: 'Active' },
  { id: 'on-hold', label: 'On hold' },
  { id: 'completed', label: 'Completed' },
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]['id'];

export interface Project {
  id: string;
  name: string;
  code: string; // 2–6 uppercase letters/digits, shown as #CODE
  client: string;
  description: string;
  status: ProjectStatus;
  teamId: string | null; // null = personal project
  teamName: string | null;
  createdBy: string | null; // member name
  isMine: boolean; // created by the current user
}

/** A team the current user belongs to. */
export interface Team {
  id: string;
  name: string;
  code: string; // VT-XXXX, shared to let others join
  description: string;
  role: 'owner' | 'member';
  memberCount: number;
  ownerName: string | null; // who owns the team (for "Jordan Lee's team")
}

/** Projects as shown under "Projects": team projects split into yours / others, plus personal. */
export interface ProjectGroups<P extends Project = Project> {
  teamYours: P[];
  teamOthers: P[];
  personal: P[];
}

export function groupProjects<P extends Project>(projects: P[]): ProjectGroups<P> {
  return {
    teamYours: projects.filter((p) => p.teamId && p.isMine),
    teamOthers: projects.filter((p) => p.teamId && !p.isMine),
    personal: projects.filter((p) => !p.teamId),
  };
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  type: TaskType;
  status: Status;
  assignee: string; // a Member name
  labelId: string | null;
  dueDate: string | null; // ISO 'YYYY-MM-DD'
  dueTime: string | null; // 'HH:MM'; null = end of the due day
  createdDate: string; // ISO 'YYYY-MM-DD'
  // AI context
  context: string;
  contextTool: ContextTool | null;
  contextUpdatedAt: string | null; // ISO timestamp
}

export type TaskInput = Omit<Task, 'id' | 'createdDate' | 'contextUpdatedAt'>;

/** One AI prompt logged against a task. */
export interface PromptEntry {
  id: string;
  tool: ContextTool | null;
  prompt: string;
  createdAt: string; // ISO timestamp
}

/** A task as shown on a board: includes its prompt history (newest first) and blockers. */
export interface BoardTask extends Task {
  prompts: PromptEntry[];
  dependsOn: string[]; // ids of tasks this one is blocked by (active or not)
  blockers: { taskId: string; active: boolean }[]; // same links, with their "active" switch
}

/** Something that happened to a task (feeds the handoff map). */
export interface TaskEvent {
  id: string;
  taskId: string;
  kind: 'created' | 'moved' | 'handoff';
  from: string | null;
  to: string | null;
  actor: string;
  at: string; // ISO timestamp
}

export const DELIVERABLES = ['presentation', 'demo', 'report', 'documentation'] as const;
export type DeliverableKind = (typeof DELIVERABLES)[number];
export type Deliverables = Record<DeliverableKind, string>;
