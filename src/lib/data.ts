import 'server-only';
import { supabase } from './supabase';
import { DELIVERABLES, type Deliverables, type Task } from './types';

// Row shape in Postgres (snake_case) ↔ app shape (camelCase).
interface TaskRow {
  id: string;
  title: string;
  description: string;
  type: Task['type'];
  status: Task['status'];
  assignee: string;
  due_date: string | null;
  created_date: string;
  context: string;
  context_tool: Task['contextTool'];
  context_updated_at: string | null;
}

function fromRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    status: row.status,
    assignee: row.assignee,
    dueDate: row.due_date,
    createdDate: row.created_date,
    context: row.context,
    contextTool: row.context_tool,
    contextUpdatedAt: row.context_updated_at,
  };
}

export async function listTasks(): Promise<Task[]> {
  const { data, error } = await supabase()
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Failed to load tasks: ${error.message}`);
  return (data as TaskRow[]).map(fromRow);
}

export async function getDeliverables(): Promise<Deliverables> {
  const { data, error } = await supabase().from('deliverables').select('kind, url');
  if (error) throw new Error(`Failed to load deliverables: ${error.message}`);
  const result = Object.fromEntries(DELIVERABLES.map((k) => [k, ''])) as Deliverables;
  for (const row of data as { kind: keyof Deliverables; url: string }[]) result[row.kind] = row.url;
  return result;
}
