// The MCP tools an AI connection can call. Safe to import from client code: the Connect
// page builds the "Try it" forms from this list, and lib/mcp/tools.ts builds the input
// schemas from the same fields, so the panel and the AI always see the same tools.

export type ToolFieldType =
  | 'project'
  | 'task'
  | 'status'
  | 'member'
  | 'ai-tool'
  | 'outcome-result'
  | 'outcome-subject'
  | 'text'
  | 'longtext'
  | 'boolean'
  | 'number'
  | 'moves';

export interface ToolField {
  name: string;
  type: ToolFieldType;
  required?: boolean;
  help: string;
}

export interface ToolInfo {
  name: string;
  title: string;
  description: string;
  write: boolean;
  fields: ToolField[];
}

const PROJECT: ToolField = { name: 'project', type: 'project', required: true, help: 'Project code (e.g. DEMO), name or id.' };
const TASK: ToolField = {
  name: 'task',
  type: 'task',
  required: true,
  help: 'Task reference like DEMO-3 (project code + its number on the board), or the task id.',
};

export const TOOL_CATALOG: ToolInfo[] = [
  // ── Read ──
  {
    name: 'list_projects',
    title: 'List projects',
    description: 'List the projects this connection can see, with their codes and how many tasks are in each column. Start here.',
    write: false,
    fields: [],
  },
  {
    name: 'get_board',
    title: 'Get board',
    description:
      'The whole Kanban board of a project as Markdown: a summary, then every column with each task\'s owner, due date, blockers, context health and stored AI context.',
    write: false,
    fields: [PROJECT, { name: 'include_prompts', type: 'boolean', help: 'Also include each task\'s prompt history (longer).' }],
  },
  {
    name: 'get_task',
    title: 'Get task',
    description: 'Everything about one task: details, stored AI context, blockers, what it blocks, recent prompts and its history.',
    write: false,
    fields: [TASK],
  },
  {
    name: 'get_task_briefing',
    title: 'Get task briefing',
    description: 'The short, ready-to-use briefing for a task (title, description and context), the same text as the app\'s "Copy context" button.',
    write: false,
    fields: [TASK],
  },
  {
    name: 'search_tasks',
    title: 'Search tasks',
    description: 'Find tasks across projects by text (title, description or context), column, owner or blocked state.',
    write: false,
    fields: [
      { name: 'query', type: 'text', help: 'Text to look for.' },
      { name: 'project', type: 'project', help: 'Only this project (code, name or id).' },
      { name: 'status', type: 'status', help: 'Only this column.' },
      { name: 'assignee', type: 'member', help: 'Only tasks owned by this person.' },
      { name: 'blocked', type: 'boolean', help: 'Only blocked tasks.' },
    ],
  },
  {
    name: 'get_activity',
    title: 'Get activity',
    description: 'Recent history of a project: tasks created, moved between columns and handed off, newest first.',
    write: false,
    fields: [PROJECT, { name: 'limit', type: 'number', help: 'How many entries (default 20, max 100).' }],
  },
  {
    name: 'get_outcomes',
    title: 'Get outcomes',
    description:
      "The outcome log the team recorded: for each task, which prompts and contexts worked or didn't, and why. Use it to reuse what worked and avoid what didn't.",
    write: false,
    fields: [PROJECT, { name: 'task', type: 'task', help: 'Only this task, e.g. DEMO-2.' }],
  },
  {
    name: 'get_deliverables',
    title: 'Get deliverables',
    description: 'The project\'s pinned links: presentation, demo, report and documentation.',
    write: false,
    fields: [PROJECT],
  },

  // ── Write (only for connections allowed to move tasks) ──
  {
    name: 'move_task',
    title: 'Move task',
    description:
      'Move a task to another column. Blocked tasks can\'t move to Review or Done unless force is true.',
    write: true,
    fields: [
      TASK,
      { name: 'to', type: 'status', required: true, help: 'The column to move it to.' },
      { name: 'force', type: 'boolean', help: 'Move even if the task is blocked.' },
    ],
  },
  {
    name: 'move_tasks',
    title: 'Move several tasks',
    description: 'Move several tasks at once. Reports which moves worked and which didn\'t.',
    write: true,
    fields: [
      { name: 'moves', type: 'moves', required: true, help: 'The moves, each a task reference and a column.' },
      { name: 'force', type: 'boolean', help: 'Move blocked tasks too.' },
    ],
  },
  {
    name: 'hand_off_task',
    title: 'Hand off task',
    description: 'Reassign a task to another team member.',
    write: true,
    fields: [TASK, { name: 'to', type: 'member', required: true, help: 'Name of the person to hand it to.' }],
  },
  {
    name: 'add_blocker',
    title: 'Add blocker',
    description: 'Mark a task as blocked by another task in the same project.',
    write: true,
    fields: [TASK, { name: 'blocker', type: 'task', required: true, help: 'The task that blocks it, e.g. DEMO-2.' }],
  },
  {
    name: 'remove_blocker',
    title: 'Remove blocker',
    description: 'Remove a "blocked by" link between two tasks.',
    write: true,
    fields: [TASK, { name: 'blocker', type: 'task', required: true, help: 'The blocking task to unlink.' }],
  },
  {
    name: 'log_prompt',
    title: 'Log prompt',
    description: 'Add a prompt you used to the task\'s prompt history, so the team can see how the work was produced.',
    write: true,
    fields: [
      TASK,
      { name: 'prompt', type: 'longtext', required: true, help: 'The prompt text.' },
      { name: 'tool', type: 'ai-tool', help: 'Which AI tool it was used with.' },
    ],
  },
  {
    name: 'record_outcome',
    title: 'Record outcome (on instruction only)',
    description:
      "Record whether a prompt or the task's context was successful, and why. ONLY call this when the person you are working with explicitly tells you to record an outcome; never decide to record one yourself. " +
      'Pass their exact words as operator_instruction and use the reason they gave. Works on the Demo Board only.',
    write: true,
    fields: [
      TASK,
      { name: 'about', type: 'outcome-subject', required: true, help: "context (the task's current context) or prompt." },
      { name: 'prompt', type: 'number', help: 'For about = prompt: the prompt number from get_task (#1 is the oldest). Defaults to the latest.' },
      { name: 'result', type: 'outcome-result', required: true, help: 'success or failure.' },
      { name: 'reason', type: 'longtext', required: true, help: "Why it was or wasn't successful, as the person explained it." },
      {
        name: 'operator_instruction',
        type: 'longtext',
        required: true,
        help: "The person's exact words asking you to record this outcome. Shown next to the outcome in the app.",
      },
    ],
  },
  {
    name: 'update_context',
    title: 'Update context',
    description:
      'Replace a task\'s stored AI context (background, constraints, what was tried, where to pick up). The previous version is kept and can be restored from the app.',
    write: true,
    fields: [
      TASK,
      { name: 'context', type: 'longtext', required: true, help: 'The new context, in Markdown.' },
      { name: 'tool', type: 'ai-tool', help: 'Which AI tool wrote it.' },
    ],
  },
];

export function toolInfo(name: string) {
  return TOOL_CATALOG.find((t) => t.name === name);
}
