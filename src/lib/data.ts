import 'server-only';
import { cache } from 'react';
import { canSee, getCurrentUser, type CurrentUser } from './current-user';
import { averageHealth } from './health';
import { supabase } from './supabase';
import { DELIVERABLES, type BoardTask, type Deliverables, type Label, type Member, type Project, type Task, type TaskEvent, type TaskOutcome, type Team } from './types';

// Row shape in Postgres (snake_case) ↔ app shape (camelCase).
interface TaskRow {
  id: string;
  project_id: string;
  title: string;
  description: string;
  type: Task['type'];
  status: Task['status'];
  assignee: string;
  label_id: string | null;
  due_date: string | null;
  due_time: string | null;
  created_date: string;
  context: string;
  context_tool: Task['contextTool'];
  context_updated_at: string | null;
}

interface OutcomeRow {
  id: string;
  subject: TaskOutcome['subject'];
  prompt_id: string | null;
  context_snapshot: string | null;
  result: TaskOutcome['result'];
  reason: string;
  recorded_by: string;
  source: TaskOutcome['source'];
  operator_instruction: string | null;
  created_at: string;
  updated_at: string;
}

function outcomeFromRow(row: OutcomeRow): TaskOutcome {
  return {
    id: row.id,
    subject: row.subject,
    promptId: row.prompt_id,
    contextSnapshot: row.context_snapshot,
    result: row.result,
    reason: row.reason,
    recordedBy: row.recorded_by,
    source: row.source,
    operatorInstruction: row.operator_instruction,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface PromptRow {
  id: string;
  tool: Task['contextTool'];
  prompt: string;
  created_at: string;
}

function fromRow(row: TaskRow): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    type: row.type,
    status: row.status,
    assignee: row.assignee,
    labelId: row.label_id,
    dueDate: row.due_date,
    dueTime: row.due_time ? row.due_time.slice(0, 5) : null, // HH:MM:SS → HH:MM
    createdDate: row.created_date,
    context: row.context,
    contextTool: row.context_tool,
    contextUpdatedAt: row.context_updated_at,
  };
}

// Projects carry their team and creator; `isMine` is relative to the current user.
const PROJECT_SELECT =
  'id, name, code, client, description, status, is_demo, team_id, created_by, team:teams(name), creator:members!projects_created_by_fkey(name)';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ProjectRow {
  id: string;
  name: string;
  code: string;
  client: string;
  description: string;
  status: Project['status'];
  is_demo: boolean;
  team_id: string | null;
  created_by: string | null;
  team: { name: string } | null;
  creator: { name: string } | null;
}

function projectFromRow(row: ProjectRow, user: CurrentUser): Project {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    client: row.client,
    description: row.description,
    status: row.status,
    teamId: row.team_id,
    teamName: row.team?.name ?? null,
    createdBy: row.creator?.name ?? null,
    isMine: row.created_by === user.id,
    isDemo: row.is_demo,
  };
}

// The list* loaders below are wrapped in React's cache(): the sidebar and the page both ask for
// them, and this way each runs one database query per request instead of two.

/**
 * Projects the current user can see: their personal projects, every project in their teams,
 * and the Demo Board (same rule as canSee).
 */
export const listProjects = cache(async (): Promise<Project[]> => {
  const user = await getCurrentUser();
  const visibility = [`and(team_id.is.null,created_by.eq.${user.id})`, 'is_demo.eq.true'];
  if (user.teamIds.length) visibility.push(`team_id.in.(${user.teamIds.join(',')})`);

  const { data, error } = await supabase()
    .from('projects')
    .select(PROJECT_SELECT)
    .or(visibility.join(','))
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Failed to load projects: ${error.message}`);
  return (data as unknown as ProjectRow[]).filter((row) => canSee(user, row)).map((row) => projectFromRow(row, user));
});

export interface ProjectSummary extends Project {
  counts: Record<Task['status'], number>;
  overdue: number;
  health: number | null; // average context health of open tasks
}

/** Visible projects plus per-stage task counts and overdue count, for the projects list. */
export async function listProjectSummaries(): Promise<ProjectSummary[]> {
  const projects = await listProjects();
  if (projects.length === 0) return [];
  const tasks = await supabase()
    .from('tasks')
    .select('project_id, status, due_date, context, context_tool, task_prompts(count)')
    .in(
      'project_id',
      projects.map((p) => p.id),
    );
  if (tasks.error) throw new Error(`Failed to load tasks: ${tasks.error.message}`);

  const today = new Date().toISOString().slice(0, 10);
  return projects.map((project) => {
    const counts = { todo: 0, 'in-progress': 0, review: 0, done: 0 };
    let overdue = 0;
    type Row = { project_id: string; status: Task['status']; due_date: string | null; context: string; context_tool: Task['contextTool']; task_prompts: { count: number }[] };
    const rows = (tasks.data as unknown as Row[]).filter((t) => t.project_id === project.id);
    for (const t of rows) {
      counts[t.status]++;
      if (t.status !== 'done' && t.due_date && t.due_date < today) overdue++;
    }
    const health = averageHealth(
      rows.map((t) => ({
        status: t.status,
        context: t.context,
        contextTool: t.context_tool,
        prompts: Array.from({ length: t.task_prompts[0]?.count ?? 0 }, () => ({ id: '', tool: null, prompt: '', createdAt: '' })),
      })),
    );
    return { ...project, counts, overdue, health };
  });
}

/** Teams the current user belongs to, with their role and the team size. */
export const listMyTeams = cache(async (): Promise<Team[]> => {
  const user = await getCurrentUser();
  const { data, error } = await supabase()
    .from('team_members')
    .select('role, team:teams(id, name, code, description, created_at, team_members(count), owners:team_members(role, member:members(name)))')
    .eq('member_id', user.id);
  if (error) throw new Error(`Failed to load teams: ${error.message}`);

  type Row = {
    role: Team['role'];
    team: {
      id: string;
      name: string;
      code: string;
      description: string;
      created_at: string;
      team_members: { count: number }[];
      owners: { role: string; member: { name: string } | null }[];
    };
  };
  return (data as unknown as Row[])
    .filter((r) => r.team)
    .sort((a, b) => a.team.created_at.localeCompare(b.team.created_at))
    .map((r) => ({
      id: r.team.id,
      name: r.team.name,
      code: r.team.code,
      description: r.team.description,
      role: r.role,
      memberCount: r.team.team_members[0]?.count ?? 0,
      ownerName: r.team.owners.find((o) => o.role === 'owner')?.member?.name ?? null,
    }));
});

/** Placeholder people tasks can be assigned to. */
export const listMembers = cache(async (): Promise<Member[]> => {
  const { data, error } = await supabase().from('members').select('id, name, avatar').order('created_at', { ascending: true });
  if (error) throw new Error('Failed to load members: ' + error.message);
  return data as Member[];
});

/** Colour labels tasks can be tagged with. */
export const listLabels = cache(async (): Promise<Label[]> => {
  const { data, error } = await supabase().from('labels').select('id, name, color').order('created_at', { ascending: true });
  if (error) throw new Error('Failed to load labels: ' + error.message);
  return data as Label[];
});

/** Returns null for unknown ids, malformed ids, or projects the current user can't see. */
export async function getProject(id: string): Promise<Project | null> {
  if (!UUID.test(id)) return null;
  // Load the project and the user side by side; visibility is checked once both arrive.
  const [user, { data, error }] = await Promise.all([getCurrentUser(), supabase().from('projects').select(PROJECT_SELECT).eq('id', id).maybeSingle()]);
  if (error) throw new Error(`Failed to load project: ${error.message}`);
  if (!data) return null;
  const row = data as unknown as ProjectRow;
  return canSee(user, row) ? projectFromRow(row, user) : null;
}

/**
 * A project's tasks with their prompt history (newest prompt first) and outcomes (oldest first), in one query.
 * Each task gets its reference (DEMO-3): the project code + its position, oldest first.
 */
export async function listTasks(project: Pick<Project, 'id' | 'code'>): Promise<BoardTask[]> {
  const { data, error } = await supabase()
    .from('tasks')
    .select(
      '*, task_prompts(id, tool, prompt, created_at), blockers:task_dependencies!task_dependencies_task_id_fkey(depends_on, active, created_at), ' +
        'task_outcomes(id, subject, prompt_id, context_snapshot, result, reason, recorded_by, source, operator_instruction, created_at, updated_at)',
    )
    .eq('project_id', project.id)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true }) // tie-break so references never swap
    .order('created_at', { referencedTable: 'task_prompts', ascending: false })
    .order('created_at', { referencedTable: 'task_outcomes', ascending: true });
  if (error) throw new Error(`Failed to load tasks: ${error.message}`);
  type Row = TaskRow & { task_prompts: PromptRow[]; blockers: { depends_on: string; active: boolean; created_at: string }[]; task_outcomes: OutcomeRow[] };
  return (data as unknown as Row[]).map((row, i) => ({
    ...fromRow(row),
    ref: `${project.code}-${i + 1}`,
    prompts: row.task_prompts.map((p) => ({ id: p.id, tool: p.tool, prompt: p.prompt, createdAt: p.created_at })),
    dependsOn: row.blockers.map((b) => b.depends_on),
    blockers: [...row.blockers]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((b) => ({ taskId: b.depends_on, active: b.active })),
    outcomes: row.task_outcomes.map(outcomeFromRow),
  }));
}

export async function getDeliverables(projectId: string): Promise<Deliverables> {
  const { data, error } = await supabase().from('deliverables').select('kind, url').eq('project_id', projectId);
  if (error) throw new Error(`Failed to load deliverables: ${error.message}`);
  const result = Object.fromEntries(DELIVERABLES.map((k) => [k, ''])) as Deliverables;
  for (const row of data as { kind: keyof Deliverables; url: string }[]) result[row.kind] = row.url;
  return result;
}

/** A project's task history (moves, handoffs), newest first. */
export async function listEvents(projectId: string): Promise<TaskEvent[]> {
  const { data, error } = await supabase()
    .from('task_events')
    .select('id, task_id, kind, from_value, to_value, actor, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error('Failed to load history: ' + error.message);
  return (data ?? []).map((e) => ({
    id: e.id,
    taskId: e.task_id,
    kind: e.kind,
    from: e.from_value,
    to: e.to_value,
    actor: e.actor,
    at: e.created_at,
  }));
}
