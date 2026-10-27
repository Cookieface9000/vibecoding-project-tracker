import 'server-only';
import { getCurrentUser } from './current-user';
import { supabase } from './supabase';
import { DELIVERABLES, type ContextTool, type OutcomeResult, type Status, type TaskType } from './types';

// The Demo Board: a personal project a reviewer (or their AI) can rearrange freely.
// resetDemoBoard() puts it back to this exact state, creating it the first time.

const DEMO = {
  name: 'Demo Board',
  code: 'DEMO',
  client: 'Reviewer demo',
  description: 'Sample board for trying the app and the AI connection. Rearrange anything, then reset it from the Connect an AI page.',
};

interface DemoTask {
  title: string;
  description: string;
  type: TaskType;
  status: Status;
  assignee: string;
  label: string;
  dueInDays: number | null;
  context: string;
  contextTool: ContextTool | null;
  prompts: { tool: ContextTool; prompt: string; hoursAgo: number }[];
  blockedBy: number[]; // positions (1-based) in DEMO_TASKS, i.e. DEMO-n
}

const ctx = (background: string, constraints: string[], tried: string, pickUp: string) =>
  `## Context\n**Background**\n${background}\n\n**Constraints**\n${constraints.map((c) => `- ${c}`).join('\n')}\n\n**Tried so far**\n${tried}\n\n**Pick up**\n${pickUp}\n`;

// Order matters: position n is task DEMO-n on the board.
const DEMO_TASKS: DemoTask[] = [
  {
    title: 'Write the landing page copy',
    description: 'Hero, three feature blurbs and a call to action for the public landing page.',
    type: 'feature',
    status: 'todo',
    assignee: 'Riley Chen',
    label: 'Design',
    dueInDays: 5,
    context: '',
    contextTool: null,
    prompts: [],
    blockedBy: [],
  },
  {
    title: 'Add rate limiting to the login API',
    description: 'Throttle repeated failed sign-ins per IP address and per account.',
    type: 'feature',
    status: 'in-progress',
    assignee: 'Me',
    label: 'Backend',
    dueInDays: 0,
    context: ctx(
      'Credential-stuffing attempts showed up in last week\'s logs. Login has no throttling at all.',
      ['No new infrastructure: use the existing Postgres database.', 'Lock-outs must never reveal whether an account exists.'],
      'Sliding-window counter per IP works in tests. Per-account limits not started.',
      'Add the per-account limit (5 failures in 15 minutes), then write the 429 response and its tests.',
    ),
    contextTool: 'Claude',
    prompts: [
      { tool: 'Claude', prompt: 'Design a sliding-window rate limiter for a login endpoint using only Postgres. Show the table and the query.', hoursAgo: 26 },
      { tool: 'Claude', prompt: 'Write Vitest tests for the per-IP limiter: allow 10 attempts per minute, block the 11th, reset after the window.', hoursAgo: 3 },
    ],
    blockedBy: [],
  },
  {
    title: 'Fix dark-mode contrast on task cards',
    description: 'Due dates on cards fail WCAG AA contrast in dark mode.',
    type: 'bug',
    status: 'review',
    assignee: 'Alex Morgan',
    label: 'Frontend',
    dueInDays: -1,
    context: ctx(
      'Reported in the accessibility audit: due-date text is #6B7280 on #1F2937 (3.9:1).',
      ['Keep the urgency colours recognisable for colour-blind users.'],
      'Raised the text to the slate-300 token (7.4:1). Waiting for review.',
      'Check the overdue badge too, then merge.',
    ),
    contextTool: 'Cursor',
    prompts: [{ tool: 'Cursor', prompt: 'Find every text colour on the task card that fails 4.5:1 contrast on the dark card background and suggest the closest passing token.', hoursAgo: 20 }],
    blockedBy: [],
  },
  {
    title: 'Set up error monitoring',
    description: 'Capture server and browser errors with release tags.',
    type: 'feature',
    status: 'done',
    assignee: 'Sam Patel',
    label: 'Infrastructure',
    dueInDays: -3,
    context: ctx('We had no visibility into production errors.', ['Free tier only.'], 'Installed and verified with a test error.', 'Nothing left: done.'),
    contextTool: 'ChatGPT',
    prompts: [],
    blockedBy: [],
  },
  {
    title: 'Connect checkout to the payments API',
    description: 'Replace the mock payment step with the real payments API in test mode.',
    type: 'feature',
    status: 'todo',
    assignee: 'Jordan Lee',
    label: 'Backend',
    dueInDays: 3,
    context: ctx(
      'Checkout currently fakes a successful payment.',
      ['Test mode only until security sign-off.', 'Must go through the rate-limited login (DEMO-2).'],
      'Nothing yet.',
      'Wait for DEMO-2, then start with the payment-intent endpoint.',
    ),
    contextTool: 'Claude',
    prompts: [],
    blockedBy: [2],
  },
  {
    title: 'Record the demo video',
    description: 'Three-minute walkthrough of the board, AI context and handoffs.',
    type: 'feature',
    status: 'todo',
    assignee: 'Me',
    label: 'Docs',
    dueInDays: 7,
    context: '',
    contextTool: null,
    prompts: [],
    blockedBy: [3, 5],
  },
  {
    title: 'Draft the final report',
    description: 'Write up the approach, decisions and what we would do next.',
    type: 'feature',
    status: 'in-progress',
    assignee: 'Me',
    label: 'Docs',
    dueInDays: 6,
    context: ctx(
      'Report is due with the final submission.',
      ['2,000 words maximum.', 'Include screenshots of the board and the AI connection.'],
      'Outline and introduction drafted.',
      'Write the "Design decisions" section next.',
    ),
    contextTool: 'ChatGPT',
    prompts: [{ tool: 'ChatGPT', prompt: 'Turn these bullet points into a 300-word introduction for a project report about an AI-aware Kanban tracker.', hoursAgo: 48 }],
    blockedBy: [],
  },
  {
    title: 'Accessibility audit',
    description: 'Keyboard, screen reader and contrast pass over every page.',
    type: 'feature',
    status: 'review',
    assignee: 'Riley Chen',
    label: 'Research',
    dueInDays: 1,
    context: '',
    contextTool: null,
    prompts: [],
    blockedBy: [],
  },
];

// Example outcomes, so the Insights outcome tree has something to show.
// `about`: 'context', or the prompt's number on that task (#1 = its oldest prompt).
const DEMO_OUTCOMES: { task: number; about: 'context' | number; result: OutcomeResult; reason: string; by: string; hoursAgo: number }[] = [
  {
    task: 2,
    about: 1,
    result: 'success',
    reason: 'The Postgres-only design worked first time and needed no new infrastructure. The table and query are now in the context.',
    by: 'Me',
    hoursAgo: 24,
  },
  {
    task: 2,
    about: 2,
    result: 'failure',
    reason: 'The tests passed locally but the "reset after the window" case was flaky because it used real timers. Next time ask for fake timers.',
    by: 'Me',
    hoursAgo: 2,
  },
  {
    task: 3,
    about: 'context',
    result: 'success',
    reason: 'The colour-blind constraint stopped the AI just making everything red. Contrast now passes and the urgency colours are still distinct.',
    by: 'Alex Morgan',
    hoursAgo: 18,
  },
  {
    task: 7,
    about: 1,
    result: 'failure',
    reason: 'The introduction came out generic and over the word limit. Giving it the outline and the 300-word cap up front should fix it.',
    by: 'Me',
    hoursAgo: 46,
  },
];

const isoDate = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const ago = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

/** Find the demo project, creating it if needed. */
async function demoProjectId(): Promise<string> {
  const db = supabase();
  const { data: existing } = await db.from('projects').select('id').eq('is_demo', true).order('created_at').limit(1).maybeSingle();
  if (existing) return existing.id;

  const user = await getCurrentUser();
  const { data: project, error } = await db
    .from('projects')
    .insert({ ...DEMO, created_by: user.id, is_demo: true })
    .select('id')
    .single();
  if (error) throw new Error(`Couldn't create the demo project: ${error.message}`);
  await db.from('deliverables').insert(DELIVERABLES.map((kind) => ({ project_id: project.id, kind, url: '' })));
  return project.id;
}

/** Restore the demo board to its starting state. Returns the project id. */
export async function resetDemoBoard(): Promise<string> {
  const db = supabase();
  const projectId = await demoProjectId();

  // Deleting the tasks also removes their prompts, history and blocker links.
  const del = await db.from('tasks').delete().eq('project_id', projectId);
  if (del.error) throw new Error(`Couldn't clear the demo board: ${del.error.message}`);
  await db.from('projects').update({ ...DEMO, status: 'active' }).eq('id', projectId);

  const { data: labels } = await db.from('labels').select('id, name');
  const labelId = (name: string) => labels?.find((l) => l.name === name)?.id ?? null;

  // Staggered created_at fixes the board order, and so the DEMO-n numbering.
  const start = Date.now() - 10 * 86_400_000;
  const { data: tasks, error } = await db
    .from('tasks')
    .insert(
      DEMO_TASKS.map((t, i) => ({
        project_id: projectId,
        title: t.title,
        description: t.description,
        type: t.type,
        status: t.status,
        assignee: t.assignee,
        label_id: labelId(t.label),
        due_date: t.dueInDays === null ? null : isoDate(t.dueInDays),
        context: t.context,
        context_tool: t.contextTool,
        context_updated_at: t.context ? ago(4 + i) : null,
        created_date: new Date(start + i * 60_000).toISOString().slice(0, 10),
        created_at: new Date(start + i * 60_000).toISOString(),
      })),
    )
    .select('id, title');
  if (error) throw new Error(`Couldn't fill the demo board: ${error.message}`);
  const idOf = (position: number) => tasks.find((row) => row.title === DEMO_TASKS[position - 1].title)!.id;

  const prompts = DEMO_TASKS.flatMap((t, i) => t.prompts.map((p) => ({ task_id: idOf(i + 1), tool: p.tool, prompt: p.prompt, created_at: ago(p.hoursAgo) })));
  // Prompts first: the example outcomes point at them.
  const { data: savedPrompts, error: promptError } = await db.from('task_prompts').insert(prompts).select('id, task_id, created_at');
  if (promptError) throw new Error(`Couldn't fill the demo board: ${promptError.message}`);
  const promptOf = (task: number, n: number) =>
    (savedPrompts ?? []).filter((p) => p.task_id === idOf(task)).sort((a, b) => a.created_at.localeCompare(b.created_at))[n - 1]?.id ?? null;
  const { data: members } = await db.from('members').select('id, name');
  const outcomes = DEMO_OUTCOMES.map((o) => ({
    task_id: idOf(o.task),
    project_id: projectId,
    subject: o.about === 'context' ? 'context' : 'prompt',
    prompt_id: o.about === 'context' ? null : promptOf(o.task, o.about),
    context_snapshot: o.about === 'context' ? DEMO_TASKS[o.task - 1].context : null,
    result: o.result,
    reason: o.reason,
    recorded_by: o.by,
    member_id: members?.find((m) => m.name === o.by)?.id ?? null,
    source: 'human',
    created_at: ago(o.hoursAgo),
    updated_at: ago(o.hoursAgo),
  }));
  const links = DEMO_TASKS.flatMap((t, i) => t.blockedBy.map((b) => ({ task_id: idOf(i + 1), depends_on: idOf(b), active: true })));
  type EventRow = { task_id: string; project_id: string; kind: string; from_value: string | null; to_value: string; actor: string; created_at: string };
  const events = DEMO_TASKS.flatMap((t, i): EventRow[] => {
    const taskId = idOf(i + 1);
    const created = { task_id: taskId, project_id: projectId, kind: 'created', from_value: null, to_value: 'todo', actor: 'Me', created_at: new Date(start + i * 60_000).toISOString() };
    if (t.status === 'todo') return [created];
    return [created, { task_id: taskId, project_id: projectId, kind: 'moved', from_value: 'todo', to_value: t.status, actor: t.assignee, created_at: ago(30 - i) }];
  });
  events.push({ task_id: idOf(3), project_id: projectId, kind: 'handoff', from_value: 'Me', to_value: 'Alex Morgan', actor: 'Me', created_at: ago(40) });

  const results = await Promise.all([
    db.from('task_outcomes').insert(outcomes),
    db.from('task_dependencies').insert(links),
    db.from('task_events').insert(events),
  ]);
  const failed = results.find((r) => r?.error);
  if (failed?.error) throw new Error(`Couldn't fill the demo board: ${failed.error.message}`);
  return projectId;
}
