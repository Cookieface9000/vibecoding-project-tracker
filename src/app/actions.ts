'use server';

import { revalidatePath } from 'next/cache';
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

function validate(input: TaskInput) {
  const title = input.title?.trim();
  if (!title) throw new Error('Title is required');
  if (!TASK_TYPES.includes(input.type)) throw new Error('Invalid type');
  if (!STAGES.some((s) => s.id === input.status)) throw new Error('Invalid status');
  if (!(TEAM as readonly string[]).includes(input.assignee)) throw new Error('Invalid assignee');
  if (input.contextTool && !CONTEXT_TOOLS.includes(input.contextTool)) throw new Error('Invalid AI tool');
  if (input.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) throw new Error('Invalid due date');

  return {
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
  revalidatePath('/');
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
  revalidatePath('/');
}

export async function deleteTask(id: string) {
  const { error } = await supabase().from('tasks').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete task: ${error.message}`);
  revalidatePath('/');
}

export async function setDeliverable(kind: DeliverableKind, url: string) {
  if (!DELIVERABLES.includes(kind)) throw new Error('Invalid deliverable');
  const trimmed = url.trim();
  if (trimmed && !/^https?:\/\//i.test(trimmed)) throw new Error('URL must start with http:// or https://');
  const { error } = await supabase().from('deliverables').upsert({ kind, url: trimmed });
  if (error) throw new Error(`Failed to save deliverable: ${error.message}`);
  revalidatePath('/');
}
