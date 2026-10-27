import 'server-only';
import { getCurrentUser } from './current-user';
import { supabase } from './supabase';
import { STAGES, type Status } from './types';

// Write helpers shared by the server actions (the web app) and the MCP tools (AI connections).
// Kept out of actions.ts: every export of a 'use server' file becomes a callable endpoint.

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A problem with the caller's input. Its message is safe to show to the user. */
export class InvalidInput extends Error {}

export type Db = ReturnType<typeof supabase>;

export function isStatus(value: unknown): value is Status {
  return STAGES.some((s) => s.id === value);
}

/**
 * Record what happened to a task. History is best-effort: it never blocks the change itself.
 * `actor` defaults to the current user; AI connections pass their own name.
 */
export async function logEvent(
  db: Db,
  e: { taskId: string; projectId: string; kind: 'created' | 'moved' | 'handoff'; from?: string | null; to?: string | null },
  actor?: string,
) {
  await db.from('task_events').insert({
    task_id: e.taskId,
    project_id: e.projectId,
    kind: e.kind,
    from_value: e.from ?? null,
    to_value: e.to ?? null,
    actor: actor ?? (await getCurrentUser()).name,
  });
}

/**
 * Check that `taskId` may be blocked by exactly `ids`: other tasks in the same project, and
 * no cycle (A blocked by B blocked by A) — inactive links count too, so a loop can't appear
 * later just by switching a link back on.
 */
export async function assertValidBlockers(db: Db, projectId: string, taskId: string, ids: string[]) {
  if (ids.some((id) => !UUID.test(id))) throw new InvalidInput('Invalid blocking task.');
  if (ids.includes(taskId)) throw new InvalidInput("A task can't block itself.");

  const { data: projectTasks, error } = await db.from('tasks').select('id').eq('project_id', projectId);
  if (error) throw new Error(error.message);
  const inProject = new Set((projectTasks ?? []).map((t) => t.id as string));
  if (!inProject.has(taskId) || ids.some((id) => !inProject.has(id))) {
    throw new InvalidInput('Blocking tasks must be in the same project.');
  }

  const { data: edges } = await db.from('task_dependencies').select('task_id, depends_on').in('task_id', [...inProject]);
  const graph = new Map<string, string[]>();
  for (const e of edges ?? []) if (e.task_id !== taskId) graph.set(e.task_id, [...(graph.get(e.task_id) ?? []), e.depends_on]);
  graph.set(taskId, ids);
  const reachesTask = (from: string, seen = new Set<string>()): boolean => {
    for (const next of graph.get(from) ?? []) {
      if (next === taskId) return true;
      if (!seen.has(next)) {
        seen.add(next);
        if (reachesTask(next, seen)) return true;
      }
    }
    return false;
  };
  if (ids.some((id) => reachesTask(id))) {
    throw new InvalidInput('That would create a loop: a task would end up blocking itself.');
  }
}

/** Current blocker ids of a task. */
export async function currentBlockerIds(db: Db, taskId: string): Promise<string[]> {
  const { data, error } = await db.from('task_dependencies').select('depends_on').eq('task_id', taskId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((d) => d.depends_on as string);
}

/** Change a task's column, logging the move. Returns the previous status. */
export async function setTaskStatus(db: Db, id: string, projectId: string, status: Status, actor?: string) {
  const { data: current } = await db.from('tasks').select('status').eq('id', id).eq('project_id', projectId).single();
  const { error } = await db.from('tasks').update({ status }).eq('id', id).eq('project_id', projectId);
  if (!error && current && current.status !== status) {
    await logEvent(db, { taskId: id, projectId, kind: 'moved', from: current.status, to: status }, actor);
  }
  return { error, from: (current?.status ?? null) as Status | null };
}

/** Reassign a task to a member (by name), logging the handoff. Returns the previous assignee. */
export async function setTaskAssignee(db: Db, id: string, projectId: string, assignee: string, actor?: string) {
  const { data: member } = await db.from('members').select('name').eq('name', assignee).maybeSingle();
  if (!member) throw new InvalidInput('Choose someone from the list.');
  const { data: current } = await db.from('tasks').select('assignee').eq('id', id).eq('project_id', projectId).single();
  const { error } = await db.from('tasks').update({ assignee: member.name }).eq('id', id).eq('project_id', projectId);
  if (!error && current && current.assignee !== member.name) {
    await logEvent(db, { taskId: id, projectId, kind: 'handoff', from: current.assignee, to: member.name }, actor);
  }
  return { error, from: (current?.assignee ?? null) as string | null };
}
