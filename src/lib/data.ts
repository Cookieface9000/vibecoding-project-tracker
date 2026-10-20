import 'server-only';
import { supabase } from './supabase';
import { DELIVERABLES, type BoardTask, type Deliverables, type Label, type Member, type Project, type Task } from './types';

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

const PROJECT_COLUMNS = 'id, name, code, client, description, status';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await supabase()
    .from('projects')
    .select(PROJECT_COLUMNS)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Failed to load projects: ${error.message}`);
  return data as Project[];
}

export interface ProjectSummary extends Project {
  counts: Record<Task['status'], number>;
  overdue: number;
}

/** Projects plus per-stage task counts and overdue count, for the projects list. */
export async function listProjectSummaries(): Promise<ProjectSummary[]> {
  const db = supabase();
  const [projects, tasks] = await Promise.all([
    listProjects(),
    db.from('tasks').select('project_id, status, due_date'),
  ]);
  if (tasks.error) throw new Error(`Failed to load tasks: ${tasks.error.message}`);

  const today = new Date().toISOString().slice(0, 10);
  return projects.map((project) => {
    const counts = { todo: 0, 'in-progress': 0, review: 0, done: 0 };
    let overdue = 0;
    for (const t of tasks.data as { project_id: string; status: Task['status']; due_date: string | null }[]) {
      if (t.project_id !== project.id) continue;
      counts[t.status]++;
      if (t.status !== 'done' && t.due_date && t.due_date < today) overdue++;
    }
    return { ...project, counts, overdue };
  });
}

/** Placeholder people tasks can be assigned to. */
export async function listMembers(): Promise<Member[]> {
  const { data, error } = await supabase().from('members').select('id, name').order('created_at', { ascending: true });
  if (error) throw new Error('Failed to load members: ' + error.message);
  return data as Member[];
}

/** Colour labels tasks can be tagged with. */
export async function listLabels(): Promise<Label[]> {
  const { data, error } = await supabase().from('labels').select('id, name, color').order('created_at', { ascending: true });
  if (error) throw new Error('Failed to load labels: ' + error.message);
  return data as Label[];
}

/** Returns null for unknown or malformed ids so pages can 404. */
export async function getProject(id: string): Promise<Project | null> {
  if (!UUID.test(id)) return null;
  const { data, error } = await supabase().from('projects').select(PROJECT_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw new Error(`Failed to load project: ${error.message}`);
  return data as Project | null;
}

/** A project's tasks with their prompt history (newest prompt first), in one query. */
export async function listTasks(projectId: string): Promise<BoardTask[]> {
  const { data, error } = await supabase()
    .from('tasks')
    .select('*, task_prompts(id, tool, prompt, created_at)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
    .order('created_at', { referencedTable: 'task_prompts', ascending: false });
  if (error) throw new Error(`Failed to load tasks: ${error.message}`);
  return (data as (TaskRow & { task_prompts: PromptRow[] })[]).map((row) => ({
    ...fromRow(row),
    prompts: row.task_prompts.map((p) => ({ id: p.id, tool: p.tool, prompt: p.prompt, createdAt: p.created_at })),
  }));
}

export async function getDeliverables(projectId: string): Promise<Deliverables> {
  const { data, error } = await supabase().from('deliverables').select('kind, url').eq('project_id', projectId);
  if (error) throw new Error(`Failed to load deliverables: ${error.message}`);
  const result = Object.fromEntries(DELIVERABLES.map((k) => [k, ''])) as Deliverables;
  for (const row of data as { kind: keyof Deliverables; url: string }[]) result[row.kind] = row.url;
  return result;
}
