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
  avatar: string | null; // generated picture key (lib/avatar.ts); null = initials
}

/** The current user's editable profile. */
export interface Profile extends Member {
  username: string;
  email: string;
}

/** Someone in a team, as shown to the team's members. */
export interface TeamMember extends Member {
  role: 'owner' | 'member';
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
  isDemo: boolean; // the Demo Board, reset from the Connect an AI page
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

// ── Outcomes ──
// Whether a prompt, or the task's context, worked, and why: written by a person (or by an AI
// connection on the Demo Board, only when a person explicitly tells it to).
export const OUTCOME_RESULTS = [
  { id: 'success', label: 'Successful' },
  { id: 'failure', label: 'Unsuccessful' },
] as const;
export type OutcomeResult = (typeof OUTCOME_RESULTS)[number]['id'];
export type OutcomeSubject = 'context' | 'prompt';

export interface TaskOutcome {
  id: string;
  subject: OutcomeSubject;
  promptId: string | null; // subject = 'prompt' (null if that prompt was deleted)
  contextSnapshot: string | null; // subject = 'context': the context as it was when recorded
  result: OutcomeResult;
  reason: string;
  recordedBy: string;
  source: 'human' | 'ai';
  operatorInstruction: string | null; // AI only: the person's words that asked for it
  createdAt: string;
  updatedAt: string;
}

/** A task as shown on a board: includes its prompt history (newest first), blockers and outcomes (oldest first). */
export interface BoardTask extends Task {
  ref: string; // e.g. DEMO-3: project code + position on the board, oldest first. How AI connections name it.
  prompts: PromptEntry[];
  dependsOn: string[]; // ids of tasks this one is blocked by (active or not)
  blockers: { taskId: string; active: boolean }[]; // same links, with their "active" switch
  outcomes: TaskOutcome[];
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
