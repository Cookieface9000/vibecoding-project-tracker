'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { getCurrentUser } from '@/lib/current-user';
import { getProject } from '@/lib/data';
import { resetDemoBoard } from '@/lib/demo';
import { createConnection, revokeConnection, type CallerContext } from '@/lib/mcp/connections';
import { runTool, type ToolResult } from '@/lib/mcp/tools';
import { supabase } from '@/lib/supabase';
import { InvalidInput, UUID } from '@/lib/task-ops';

// Server actions for the Connect an AI page.

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function failure(err: unknown, fallback: string): { ok: false; error: string } {
  if (err instanceof InvalidInput) return { ok: false, error: err.message };
  console.error(fallback, err);
  return { ok: false, error: fallback };
}

/** The site's public address, as the browser reached it (so the URL works when hosted). */
async function origin() {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function createConnectionAction(input: {
  name: string;
  canWrite: boolean;
  projectId: string | null;
  days: number;
}): Promise<Result<{ url: string }>> {
  try {
    const secret = await createConnection(input);
    revalidatePath('/connect');
    return { ok: true, url: `${await origin()}/api/mcp/c/${secret}` };
  } catch (err) {
    return failure(err, "Couldn't create the connection. Please try again.");
  }
}

export async function revokeConnectionAction(id: string): Promise<Result> {
  try {
    await revokeConnection(id);
    revalidatePath('/connect');
    return { ok: true };
  } catch (err) {
    return failure(err, "Couldn't revoke the connection. Please try again.");
  }
}

/** The Try it panel: run a tool exactly as an AI connection would, as the current user. */
export async function runToolAction(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  const user = await getCurrentUser();
  const ctx: CallerContext = { caller: `${user.name} (Try it)`, connectionId: null, canWrite: true, projectId: null };
  const result = await runTool(name, args, ctx);
  revalidatePath('/connect');
  return result;
}

export async function resetDemoAction(): Promise<Result<{ projectId: string }>> {
  try {
    const projectId = await resetDemoBoard();
    revalidatePath('/', 'layout');
    return { ok: true, projectId };
  } catch (err) {
    return failure(err, "Couldn't reset the demo board. Please try again.");
  }
}

/** Undo an AI's update_context: put the saved version back (saving the current one first). */
export async function restoreContextAction(historyId: string): Promise<Result> {
  try {
    if (!UUID.test(historyId)) throw new InvalidInput('Invalid version.');
    const db = supabase();
    const { data: saved } = await db.from('task_context_history').select('task_id, context, context_tool').eq('id', historyId).maybeSingle();
    if (!saved) throw new InvalidInput('That version no longer exists (the task may have been deleted).');
    const { data: task } = await db.from('tasks').select('project_id, context, context_tool').eq('id', saved.task_id).maybeSingle();
    if (!task || !(await getProject(task.project_id))) throw new InvalidInput('That task no longer exists.');

    const user = await getCurrentUser();
    await db.from('task_context_history').insert({ task_id: saved.task_id, context: task.context, context_tool: task.context_tool, replaced_by: user.name });
    const { error } = await db
      .from('tasks')
      .update({ context: saved.context, context_tool: saved.context_tool, context_updated_at: new Date().toISOString() })
      .eq('id', saved.task_id);
    if (error) throw new Error(error.message);
    revalidatePath(`/projects/${task.project_id}`);
    revalidatePath('/connect');
    return { ok: true };
  } catch (err) {
    return failure(err, "Couldn't restore the context. Please try again.");
  }
}
