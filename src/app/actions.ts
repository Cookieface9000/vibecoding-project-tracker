'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { deriveProjectCode, normaliseProjectCode } from '@/lib/project-code';
import { supabase } from '@/lib/supabase';
import {
  CONTEXT_TOOLS,
  DELIVERABLES,
  STAGES,
  TASK_TYPES,
  type DeliverableKind,
  type Status,
  type TaskInput,
} from '@/lib/types';

// Server actions: the only write path to Supabase. Inputs come from the
// browser, so validate everything before it reaches the database.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Projects ────────────────────────────────────────────────────────────────

export interface ProjectFormState {
  error?: string;
  fields?: { name: string; code: string; client: string; description: string };
}

export async function createProject(_prev: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  const fields = {
    name: String(formData.get('name') ?? '').trim(),
    code: String(formData.get('code') ?? ''),
    client: String(formData.get('client') ?? '').trim(),
    description: String(formData.get('description') ?? '').trim(),
  };

  if (!fields.name) return { error: 'Give the project a name.', fields };
  if (fields.name.length > 80) return { error: 'Name must be 80 characters or fewer.', fields };
  if (fields.client.length > 80) return { error: 'Client must be 80 characters or fewer.', fields };
  if (fields.description.length > 500) return { error: 'Description must be 500 characters or fewer.', fields };

  const code = normaliseProjectCode(fields.code) || deriveProjectCode(fields.name);
  if (!/^[A-Z0-9]{2,6}$/.test(code)) return { error: 'Code must be 2–6 letters or numbers.', fields };

  const db = supabase();
  const { data: project, error } = await db
    .from('projects')
    .insert({ name: fields.name, code, client: fields.client, description: fields.description })
    .select('id')
    .single();
  if (error) return { error: `Couldn't create the project: ${error.message}`, fields };

  const { error: linksError } = await db
    .from('deliverables')
    .insert(DELIVERABLES.map((kind) => ({ project_id: project.id, kind, url: '' })));
  if (linksError) return { error: `Project created, but its links failed: ${linksError.message}`, fields };

  revalidatePath('/', 'layout');
  redirect(`/projects/${project.id}`);
}

// ── Tasks ───────────────────────────────────────────────────────────────────
// Return a result instead of throwing: thrown messages are hidden in production.

export type ActionResult = { ok: true } | { ok: false; error: string };

class InvalidInput extends Error {}

function isStatus(value: unknown): value is Status {
  return STAGES.some((s) => s.id === value);
}

async function validate(input: TaskInput) {
  const title = input.title?.trim();
  if (!title) throw new InvalidInput('Give the task a title.');
  if (title.length > 200) throw new InvalidInput('Title must be 200 characters or fewer.');
  if ((input.description ?? '').length > 5000) throw new InvalidInput('Description must be 5000 characters or fewer.');
  if (!UUID.test(input.projectId)) throw new InvalidInput('Invalid project.');
  if (!TASK_TYPES.includes(input.type)) throw new InvalidInput('Choose Feature or Bug.');
  if (!isStatus(input.status)) throw new InvalidInput('Choose a valid status.');
  if (input.contextTool && !CONTEXT_TOOLS.includes(input.contextTool)) throw new InvalidInput('Choose a valid AI tool.');
  if (input.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) throw new InvalidInput('Enter a valid due date.');
  if (input.dueTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.dueTime)) throw new InvalidInput('Enter a valid due time.');
  if (input.dueTime && !input.dueDate) throw new InvalidInput('Set a due date before a due time.');
  if (input.labelId && !UUID.test(input.labelId)) throw new InvalidInput('Choose a valid label.');

  // Assignee and label must come from the placeholder lists in the database.
  const db = supabase();
  const [member, label] = await Promise.all([
    db.from('members').select('id').eq('name', input.assignee).maybeSingle(),
    input.labelId ? db.from('labels').select('id').eq('id', input.labelId).maybeSingle() : Promise.resolve({ data: true, error: null }),
  ]);
  if (member.error || !member.data) throw new InvalidInput('Choose an assignee from the list.');
  if (label.error || !label.data) throw new InvalidInput('Choose a label from the list.');

  return {
    project_id: input.projectId,
    title,
    description: input.description?.trim() ?? '',
    type: input.type,
    status: input.status,
    assignee: input.assignee,
    label_id: input.labelId || null,
    due_date: input.dueDate || null,
    due_time: input.dueDate && input.dueTime ? input.dueTime : null,
    context: input.context ?? '',
    context_tool: input.contextTool || null,
  };
}

async function run(projectId: string, work: () => Promise<{ error: { message: string } | null }>): Promise<ActionResult> {
  try {
    const { error } = await work();
    if (error) return { ok: false, error: `Couldn't save: ${error.message}` };
  } catch (err) {
    if (err instanceof InvalidInput) return { ok: false, error: err.message };
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }
  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/');
  return { ok: true };
}

export async function createTask(input: TaskInput): Promise<ActionResult> {
  return run(input.projectId, async () => {
    const row = await validate(input);
    return supabase()
      .from('tasks')
      .insert({ ...row, context_updated_at: row.context ? new Date().toISOString() : null });
  });
}

export async function updateTask(id: string, input: TaskInput): Promise<ActionResult> {
  return run(input.projectId, async () => {
    if (!UUID.test(id)) throw new InvalidInput('Invalid task.');
    const row = await validate(input);
    const db = supabase();

    // Bump contextUpdatedAt only when the context text actually changed.
    const { data: current, error: readError } = await db
      .from('tasks')
      .select('context')
      .eq('id', id)
      .eq('project_id', row.project_id)
      .single();
    if (readError) return { error: readError };
    const contextChanged = current.context !== row.context;

    return db
      .from('tasks')
      .update(contextChanged ? { ...row, context_updated_at: new Date().toISOString() } : row)
      .eq('id', id)
      .eq('project_id', row.project_id);
  });
}

/** Drag-and-drop: change only the status. */
export async function moveTask(id: string, projectId: string, status: Status): Promise<ActionResult> {
  return run(projectId, async () => {
    if (!UUID.test(id) || !UUID.test(projectId)) throw new InvalidInput('Invalid task.');
    if (!isStatus(status)) throw new InvalidInput('Choose a valid status.');
    return supabase().from('tasks').update({ status }).eq('id', id).eq('project_id', projectId);
  });
}

export async function deleteTask(id: string, projectId: string): Promise<ActionResult> {
  return run(projectId, async () => {
    if (!UUID.test(id) || !UUID.test(projectId)) throw new InvalidInput('Invalid task.');
    return supabase().from('tasks').delete().eq('id', id).eq('project_id', projectId);
  });
}

// ── Pinned links ────────────────────────────────────────────────────────────

export async function setDeliverable(projectId: string, kind: DeliverableKind, url: string) {
  if (!UUID.test(projectId)) throw new Error('Invalid project');
  if (!DELIVERABLES.includes(kind)) throw new Error('Invalid deliverable');
  const trimmed = url.trim();
  if (trimmed && !/^https?:\/\//i.test(trimmed)) throw new Error('URL must start with http:// or https://');
  const { error } = await supabase().from('deliverables').upsert({ project_id: projectId, kind, url: trimmed });
  if (error) throw new Error(`Failed to save deliverable: ${error.message}`);
  revalidatePath(`/projects/${projectId}`);
}
