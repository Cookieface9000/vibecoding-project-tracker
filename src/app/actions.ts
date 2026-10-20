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
  TEAM,
  type DeliverableKind,
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

function validate(input: TaskInput) {
  const title = input.title?.trim();
  if (!title) throw new Error('Title is required');
  if (!UUID.test(input.projectId)) throw new Error('Invalid project');
  if (!TASK_TYPES.includes(input.type)) throw new Error('Invalid type');
  if (!STAGES.some((s) => s.id === input.status)) throw new Error('Invalid status');
  if (!(TEAM as readonly string[]).includes(input.assignee)) throw new Error('Invalid assignee');
  if (input.contextTool && !CONTEXT_TOOLS.includes(input.contextTool)) throw new Error('Invalid AI tool');
  if (input.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) throw new Error('Invalid due date');

  return {
    project_id: input.projectId,
    title,
    description: input.description ?? '',
    type: input.type,
    status: input.status,
    assignee: input.assignee,
    due_date: input.dueDate || null,
    context: input.context ?? '',
    context_tool: input.contextTool || null,
  };
}

export async function createTask(input: TaskInput) {
  const row = validate(input);
  const { error } = await supabase()
    .from('tasks')
    .insert({ ...row, context_updated_at: row.context ? new Date().toISOString() : null });
  if (error) throw new Error(`Failed to create task: ${error.message}`);
  revalidatePath(`/projects/${row.project_id}`);
}

export async function updateTask(id: string, input: TaskInput) {
  const row = validate(input);
  const db = supabase();

  // Bump contextUpdatedAt only when the context text actually changed.
  const { data: current, error: readError } = await db.from('tasks').select('context').eq('id', id).single();
  if (readError) throw new Error(`Failed to load task: ${readError.message}`);
  const contextChanged = current.context !== row.context;

  const { error } = await db
    .from('tasks')
    .update(contextChanged ? { ...row, context_updated_at: new Date().toISOString() } : row)
    .eq('id', id);
  if (error) throw new Error(`Failed to update task: ${error.message}`);
  revalidatePath(`/projects/${row.project_id}`);
}

export async function deleteTask(id: string, projectId: string) {
  const { error } = await supabase().from('tasks').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete task: ${error.message}`);
  revalidatePath(`/projects/${projectId}`);
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
