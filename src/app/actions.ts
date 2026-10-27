'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { deriveProjectCode, normaliseProjectCode } from '@/lib/project-code';
import { canSee, getCurrentUser } from '@/lib/current-user';
import { listMyTeams } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import {
  assertValidBlockers,
  currentBlockerIds,
  InvalidInput,
  isStatus,
  logEvent,
  setTaskAssignee,
  setTaskStatus,
  UUID,
  type Db,
} from '@/lib/task-ops';
import {
  CONTEXT_TOOLS,
  DELIVERABLES,
  TASK_TYPES,
  type DeliverableKind,
  type Status,
  type TaskInput,
  type Team,
} from '@/lib/types';

// Server actions: the web app's write path to Supabase (AI connections write through
// lib/mcp). Inputs come from the browser, so validate everything before it reaches the database.

// ── Projects ────────────────────────────────────────────────────────────────

export interface ProjectFormState {
  error?: string;
  fields?: { name: string; code: string; client: string; description: string; teamId: string };
}

export async function createProject(_prev: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  const fields = {
    name: String(formData.get('name') ?? '').trim(),
    code: String(formData.get('code') ?? ''),
    client: String(formData.get('client') ?? '').trim(),
    description: String(formData.get('description') ?? '').trim(),
    teamId: String(formData.get('teamId') ?? ''),
  };

  if (!fields.name) return { error: 'Give the project a name.', fields };
  if (fields.name.length > 80) return { error: 'Name must be 80 characters or fewer.', fields };
  if (fields.client.length > 80) return { error: 'Client must be 80 characters or fewer.', fields };
  if (fields.description.length > 500) return { error: 'Description must be 500 characters or fewer.', fields };

  const code = normaliseProjectCode(fields.code) || deriveProjectCode(fields.name);
  if (!/^[A-Z0-9]{2,6}$/.test(code)) return { error: 'Code must be 2–6 letters or numbers.', fields };

  // A project can only go into a team the creator belongs to ('' = personal).
  const user = await getCurrentUser();
  if (fields.teamId && !user.teamIds.includes(fields.teamId)) return { error: 'Choose a team you belong to.', fields };

  const db = supabase();
  const { data: project, error } = await db
    .from('projects')
    .insert({
      name: fields.name,
      code,
      client: fields.client,
      description: fields.description,
      team_id: fields.teamId || null,
      created_by: user.id,
    })
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

/** Only the project's creator and members of its team may change it. */
async function assertAccess(projectId: string) {
  if (!UUID.test(projectId)) throw new InvalidInput('Invalid project.');
  const user = await getCurrentUser();
  const { data } = await supabase().from('projects').select('created_by, team_id').eq('id', projectId).maybeSingle();
  if (!data || !canSee(user, data)) throw new InvalidInput("You don't have access to this project.");
}

async function run(projectId: string, work: () => Promise<{ error: { message: string } | null }>): Promise<ActionResult> {
  try {
    await assertAccess(projectId);
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

/**
 * Replace a task's "blocked by" list (from the edit form). Links that stay keep their
 * active/inactive setting; new links start active.
 */
async function setDependencies(db: Db, projectId: string, taskId: string, dependsOn: string[]) {
  const ids = [...new Set(dependsOn)].filter((id) => id !== taskId);
  await assertValidBlockers(db, projectId, taskId, ids);

  const existing = await currentBlockerIds(db, taskId);
  const removed = existing.filter((id) => !ids.includes(id));
  const added = ids.filter((id) => !existing.includes(id));
  if (removed.length) {
    const del = await db.from('task_dependencies').delete().eq('task_id', taskId).in('depends_on', removed);
    if (del.error) throw new Error(del.error.message);
  }
  if (added.length) {
    const ins = await db.from('task_dependencies').insert(added.map((depends_on) => ({ task_id: taskId, depends_on, active: true })));
    if (ins.error) throw new Error(ins.error.message);
  }
}

// ── Blockers, managed from the task itself ──────────────────────────────────

/** Add an existing task as a blocker (active). */
export async function addBlocker(taskId: string, projectId: string, blockerId: string): Promise<ActionResult> {
  return run(projectId, async () => {
    if (!UUID.test(taskId)) throw new InvalidInput('Invalid task.');
    const db = supabase();
    const existing = await currentBlockerIds(db, taskId);
    if (existing.includes(blockerId)) throw new InvalidInput('That task is already a blocker.');
    await assertValidBlockers(db, projectId, taskId, [...existing, blockerId]);
    return db.from('task_dependencies').insert({ task_id: taskId, depends_on: blockerId, active: true });
  });
}

/** Create a new To Do task and make it a blocker of `taskId` in one step. */
export async function createBlockerTask(taskId: string, projectId: string, rawTitle: string): Promise<ActionResult> {
  return run(projectId, async () => {
    if (!UUID.test(taskId)) throw new InvalidInput('Invalid task.');
    const title = rawTitle.trim();
    if (!title) throw new InvalidInput('Give the blocker a title.');
    if (title.length > 200) throw new InvalidInput('Title must be 200 characters or fewer.');
    const db = supabase();
    const user = await getCurrentUser();
    // The task being blocked must be in this project (also guards the new link).
    await assertValidBlockers(db, projectId, taskId, await currentBlockerIds(db, taskId));

    const { data: blocker, error } = await db
      .from('tasks')
      .insert({ project_id: projectId, title, status: 'todo', type: 'feature', assignee: user.name })
      .select('id')
      .single();
    if (error) return { error };
    await logEvent(db, { taskId: blocker.id, projectId, kind: 'created', to: 'todo' });
    return db.from('task_dependencies').insert({ task_id: taskId, depends_on: blocker.id, active: true });
  });
}

export async function removeBlocker(taskId: string, projectId: string, blockerId: string): Promise<ActionResult> {
  return run(projectId, async () => {
    if (!UUID.test(taskId) || !UUID.test(blockerId)) throw new InvalidInput('Invalid blocker.');
    await assertValidBlockers(supabase(), projectId, taskId, []); // task must be in this project
    return supabase().from('task_dependencies').delete().eq('task_id', taskId).eq('depends_on', blockerId);
  });
}

export async function createTask(input: TaskInput, dependsOn: string[] = []): Promise<ActionResult> {
  return run(input.projectId, async () => {
    const row = await validate(input);
    const db = supabase();
    const { data, error } = await db
      .from('tasks')
      .insert({ ...row, context_updated_at: row.context ? new Date().toISOString() : null })
      .select('id')
      .single();
    if (error) return { error };
    await setDependencies(db, row.project_id, data.id, dependsOn);
    await logEvent(db, { taskId: data.id, projectId: row.project_id, kind: 'created', to: row.status });
    return { error: null };
  });
}

export async function updateTask(id: string, input: TaskInput, dependsOn?: string[]): Promise<ActionResult> {
  return run(input.projectId, async () => {
    if (!UUID.test(id)) throw new InvalidInput('Invalid task.');
    const row = await validate(input);
    const db = supabase();

    const { data: current, error: readError } = await db
      .from('tasks')
      .select('context, status, assignee')
      .eq('id', id)
      .eq('project_id', row.project_id)
      .single();
    if (readError) return { error: readError };

    // Dependencies first: if they're invalid (e.g. a loop), nothing else is saved.
    if (dependsOn) await setDependencies(db, row.project_id, id, dependsOn);

    // Bump contextUpdatedAt only when the context text actually changed.
    const contextChanged = current.context !== row.context;
    const { error } = await db
      .from('tasks')
      .update(contextChanged ? { ...row, context_updated_at: new Date().toISOString() } : row)
      .eq('id', id)
      .eq('project_id', row.project_id);
    if (error) return { error };
    if (current.status !== row.status) {
      await logEvent(db, { taskId: id, projectId: row.project_id, kind: 'moved', from: current.status, to: row.status });
    }
    if (current.assignee !== row.assignee) {
      await logEvent(db, { taskId: id, projectId: row.project_id, kind: 'handoff', from: current.assignee, to: row.assignee });
    }
    return { error: null };
  });
}

/** Drag-and-drop: change only the status. */
export async function moveTask(id: string, projectId: string, status: Status): Promise<ActionResult> {
  return run(projectId, async () => {
    if (!UUID.test(id) || !UUID.test(projectId)) throw new InvalidInput('Invalid task.');
    if (!isStatus(status)) throw new InvalidInput('Choose a valid status.');
    const { error } = await setTaskStatus(supabase(), id, projectId, status);
    return { error };
  });
}

/** "Hand off to…": reassign a task to another member in one step. */
export async function handOffTask(id: string, projectId: string, assignee: string): Promise<ActionResult> {
  return run(projectId, async () => {
    if (!UUID.test(id) || !UUID.test(projectId)) throw new InvalidInput('Invalid task.');
    const { error } = await setTaskAssignee(supabase(), id, projectId, assignee);
    return { error };
  });
}

export async function deleteTask(id: string, projectId: string): Promise<ActionResult> {
  return run(projectId, async () => {
    if (!UUID.test(id) || !UUID.test(projectId)) throw new InvalidInput('Invalid task.');
    return supabase().from('tasks').delete().eq('id', id).eq('project_id', projectId);
  });
}

/** Clear the board: removes every task in the project (prompts, history and links cascade). */
export async function deleteAllTasks(projectId: string): Promise<ActionResult> {
  return run(projectId, async () => {
    if (!UUID.test(projectId)) throw new InvalidInput('Invalid project.');
    return supabase().from('tasks').delete().eq('project_id', projectId);
  });
}

// ── Pinned links ────────────────────────────────────────────────────────────

export async function setDeliverable(projectId: string, kind: DeliverableKind, url: string): Promise<ActionResult> {
  return run(projectId, async () => {
    if (!UUID.test(projectId)) throw new InvalidInput('Invalid project.');
    if (!DELIVERABLES.includes(kind)) throw new InvalidInput('Invalid link slot.');
    const trimmed = url.trim();
    if (trimmed.length > 2000) throw new InvalidInput('That link is too long.');
    if (trimmed) {
      let parsed: URL;
      try {
        parsed = new URL(trimmed);
      } catch {
        throw new InvalidInput('Enter a full link, e.g. https://example.com');
      }
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new InvalidInput('Links must start with http:// or https://');
      }
    }
    return supabase().from('deliverables').upsert({ project_id: projectId, kind, url: trimmed });
  });
}

// ── Teams ───────────────────────────────────────────────────────────────────

const TEAM_CODE = /^VT-[A-Z0-9]{4}$/;

function randomTeamCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'VT-' + Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export type TeamResult = { ok: true; teams: Team[]; message?: string } | { ok: false; error: string };

/** Teams the current user belongs to (for Settings and the project form). */
export async function getMyTeams(): Promise<TeamResult> {
  try {
    return { ok: true, teams: await listMyTeams() };
  } catch {
    return { ok: false, error: "Couldn't load your teams." };
  }
}

/** Join an existing team by its code. */
export async function joinTeam(rawCode: string): Promise<TeamResult> {
  const code = rawCode.trim().toUpperCase();
  if (!TEAM_CODE.test(code)) return { ok: false, error: 'Team codes look like VT-AB12.' };
  const user = await getCurrentUser();
  const db = supabase();
  const { data: team } = await db.from('teams').select('id, name').eq('code', code).maybeSingle();
  if (!team) return { ok: false, error: `No team has the code ${code}.` };
  if (user.teamIds.includes(team.id)) return { ok: false, error: `You're already in ${team.name}.` };
  const { error } = await db.from('team_members').insert({ team_id: team.id, member_id: user.id, role: 'member' });
  if (error) return { ok: false, error: `Couldn't join: ${error.message}` };
  revalidatePath('/', 'layout');
  return { ok: true, teams: await listMyTeams(), message: `Joined ${team.name}. Its projects are now in your list.` };
}

/** Create a team (you become its owner) and get a shareable join code. */
export async function createTeam(rawName: string, rawDescription: string): Promise<TeamResult & { code?: string }> {
  const name = rawName.trim();
  const description = rawDescription.trim();
  if (!name) return { ok: false, error: 'Give the team a name.' };
  if (name.length > 60) return { ok: false, error: 'Name must be 60 characters or fewer.' };
  if (description.length > 300) return { ok: false, error: 'Description must be 300 characters or fewer.' };

  const user = await getCurrentUser();
  const db = supabase();
  // Codes are unique; retry on the (unlikely) collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomTeamCode();
    const { data: team, error } = await db.from('teams').insert({ name, code, description }).select('id').single();
    if (error) {
      if (error.code === '23505') continue; // unique violation: try another code
      return { ok: false, error: `Couldn't create the team: ${error.message}` };
    }
    const { error: memberError } = await db.from('team_members').insert({ team_id: team.id, member_id: user.id, role: 'owner' });
    if (memberError) return { ok: false, error: `Team created, but joining it failed: ${memberError.message}` };
    revalidatePath('/', 'layout');
    return { ok: true, teams: await listMyTeams(), code, message: `Created ${name}.` };
  }
  return { ok: false, error: "Couldn't generate a unique team code. Please try again." };
}
