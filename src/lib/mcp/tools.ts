import 'server-only';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { isBlocked, isLinkBlocking } from '../blocking';
import { formatBoardContext } from '../board-context';
import { formatBriefing, hasContext } from '../context';
import { getDeliverables, listEvents, listLabels, listMembers, listProjects, listProjectSummaries, listTasks } from '../data';
import { dueLabel } from '../due';
import { contextHealth } from '../health';
import { supabase } from '../supabase';
import { assertValidBlockers, currentBlockerIds, InvalidInput, setTaskAssignee, setTaskStatus, UUID } from '../task-ops';
import { outcomeSubjectLabel } from '../outcome-labels';
import { insertOutcome } from '../outcomes';
import {
  CONTEXT_TOOLS,
  DELIVERABLES,
  STAGES,
  type BoardTask,
  type OutcomeResult,
  type OutcomeSubject,
  type Project,
  type Status,
  type TaskOutcome,
} from '../types';
import { TOOL_CATALOG, toolInfo, type ToolField } from './catalog';
import { recordCall, type CallerContext } from './connections';

// The MCP tools, shared by AI connections (lib/mcp/server.ts) and the in-app Try it panel.
// Every call is checked against the caller's project scope and write permission, then logged.

type Args = Record<string, unknown>;

export interface ToolResult {
  ok: boolean;
  text: string; // what the AI (or the Try it panel) sees
}

interface ToolOutput {
  text: string;
  summary: string; // one line for the AI activity list
  detail?: Record<string, unknown>;
}

const STATUS_IDS = STAGES.map((s) => s.id) as [Status, ...Status[]];
const MAX_OUTPUT = 60_000;
const stageLabel = (id: string | null) => STAGES.find((s) => s.id === id)?.label ?? id ?? '—';

// ── Input schemas, built from the catalog ───────────────────────────────────

function fieldSchema(field: ToolField) {
  const base = (() => {
    switch (field.type) {
      case 'status':
        return z.enum(STATUS_IDS);
      case 'ai-tool':
        return z.enum(CONTEXT_TOOLS);
      case 'outcome-result':
        return z.enum(['success', 'failure']);
      case 'outcome-subject':
        return z.enum(['context', 'prompt']);
      case 'boolean':
        return z.boolean();
      case 'number':
        return z.number().int().min(1).max(100);
      case 'moves':
        return z.array(z.object({ task: z.string().min(1), to: z.enum(STATUS_IDS) })).min(1).max(50);
      case 'longtext':
        return z.string().min(1).max(20_000);
      default:
        return z.string().min(1).max(200);
    }
  })().describe(field.help);
  return field.required ? base : base.optional();
}

/** The zod input shape of a tool (what the MCP SDK advertises and validates). */
export function inputShape(name: string): z.ZodRawShape {
  const info = toolInfo(name);
  return Object.fromEntries((info?.fields ?? []).map((f) => [f.name, fieldSchema(f)]));
}

// ── Resolving projects and tasks ────────────────────────────────────────────

async function visibleProjects(ctx: CallerContext) {
  const projects = await listProjects();
  return ctx.projectId ? projects.filter((p) => p.id === ctx.projectId) : projects;
}

const codesOf = (projects: Project[]) => projects.map((p) => p.code).join(', ') || 'none';

async function resolveProject(ctx: CallerContext, ref: string): Promise<Project> {
  const projects = await visibleProjects(ctx);
  const key = ref.trim().replace(/^#/, '');
  if (UUID.test(key)) {
    const match = projects.find((p) => p.id === key);
    if (match) return match;
  } else {
    const byCode = projects.filter((p) => p.code === key.toUpperCase());
    const matches = byCode.length ? byCode : projects.filter((p) => p.name.toLowerCase() === key.toLowerCase());
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      throw new InvalidInput(
        `More than one project matches "${ref}": ${matches.map((p) => `${p.name} (id ${p.id})`).join('; ')}. Use the id instead.`,
      );
    }
  }
  throw new InvalidInput(`No project "${ref}" that this connection can see. Available project codes: ${codesOf(projects)}.`);
}

interface Board {
  project: Project;
  tasks: BoardTask[];
  byId: Map<string, BoardTask>;
  ref: (t: BoardTask) => string;
}

async function loadBoard(project: Project): Promise<Board> {
  const tasks = await listTasks(project);
  // The same references the board shows on every card (from listTasks).
  return { project, tasks, byId: new Map(tasks.map((t) => [t.id, t])), ref: (t) => t.ref };
}

/** Find a task by reference (DEMO-3), plain number within `within`, or id. */
async function resolveTask(ctx: CallerContext, ref: string, within?: Board): Promise<{ board: Board; task: BoardTask }> {
  const key = ref.trim().replace(/^#/, '').replace(/^\[|\]$/g, '');

  if (UUID.test(key)) {
    const { data } = await supabase().from('tasks').select('project_id').eq('id', key).maybeSingle();
    const project = data && (await visibleProjects(ctx)).find((p) => p.id === data.project_id);
    if (!project) throw new InvalidInput(`No task with id ${key} that this connection can see.`);
    const board = within?.project.id === project.id ? within : await loadBoard(project);
    return { board, task: board.byId.get(key)! };
  }

  const match = /^(?:([A-Za-z0-9]{2,6})-)?(\d+)$/.exec(key);
  if (!match) throw new InvalidInput(`"${ref}" isn't a task reference. Use the project code and number, like DEMO-3.`);
  const [, code, num] = match;
  let board = within;
  if (code && (!board || board.project.code !== code.toUpperCase())) board = await loadBoard(await resolveProject(ctx, code));
  if (!board) {
    const projects = await visibleProjects(ctx);
    if (projects.length !== 1) throw new InvalidInput(`Include the project code, like DEMO-${num}.`);
    board = await loadBoard(projects[0]);
  }
  const task = board.tasks.find((t) => t.ref === `${board!.project.code}-${Number(num)}`);
  if (!task) throw new InvalidInput(`${board.project.code} has no task ${num}. It has ${board.tasks.length} tasks.`);
  return { board, task };
}

// ── Formatting ──────────────────────────────────────────────────────────────

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}… [${text.length - max} more characters]` : text);
const when = (iso: string) => iso.slice(0, 16).replace('T', ' ');

function line(board: Board, t: BoardTask) {
  const blocked = isBlocked(t, board.byId) ? ' · BLOCKED' : '';
  return `- [${board.ref(t)}] ${t.title} · ${stageLabel(t.status)} · ${t.assignee}${blocked}`;
}

function columnSummary(board: Board) {
  return STAGES.map((s) => `${s.label}: ${board.tasks.filter((t) => t.status === s.id).map((t) => board.ref(t)).join(', ') || '—'}`).join('\n');
}

// ── The tools ───────────────────────────────────────────────────────────────

const str = (args: Args, key: string) => (typeof args[key] === 'string' ? (args[key] as string) : undefined);

function touch(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/');
}

/** Block moving a blocked task forward to Review/Done unless forced. */
function assertCanMove(board: Board, task: BoardTask, to: Status, force: boolean) {
  if (force || (to !== 'review' && to !== 'done') || !isBlocked(task, board.byId)) return;
  const blockers = task.blockers
    .filter((l) => isLinkBlocking(l, board.byId))
    .map((l) => board.byId.get(l.taskId)!)
    .map((b) => `[${board.ref(b)}] ${b.title} (${stageLabel(b.status)})`);
  throw new InvalidInput(`[${board.ref(task)}] is blocked by ${blockers.join('; ')}. Finish the blocker first, or pass force: true.`);
}

const TOOLS: Record<string, (args: Args, ctx: CallerContext) => Promise<ToolOutput>> = {
  async list_projects(_args, ctx) {
    const scope = new Set((await visibleProjects(ctx)).map((p) => p.id));
    const projects = (await listProjectSummaries()).filter((p) => scope.has(p.id));
    if (projects.length === 0) return { text: 'No projects are visible to this connection.', summary: 'Listed projects' };
    const rows = projects.map((p) => {
      const counts = STAGES.map((s) => `${p.counts[s.id]} ${s.label.toLowerCase()}`).join(', ');
      const where = p.teamName ? `team ${p.teamName}` : 'personal';
      return `- **${p.name}** (code ${p.code}) · ${where} · ${p.status} · ${counts}${p.overdue ? ` · ${p.overdue} overdue` : ''} · id ${p.id}`;
    });
    return {
      text: `# Projects\n\n${rows.join('\n')}\n\nUse a code with get_board, e.g. get_board { project: "${projects[0].code}" }. Tasks are referred to as CODE-number, e.g. ${projects[0].code}-1.\n`,
      summary: `Listed ${projects.length} project${projects.length === 1 ? '' : 's'}`,
    };
  },

  async get_board(args, ctx) {
    const board = await loadBoard(await resolveProject(ctx, str(args, 'project')!));
    const text = formatBoardContext(board.project, board.tasks, await listLabels(), { includePrompts: args.include_prompts === true });
    return { text, summary: `Read the ${board.project.code} board`, detail: { projectId: board.project.id } };
  },

  async get_task(args, ctx) {
    const { board, task } = await resolveTask(ctx, str(args, 'task')!);
    const now = new Date();
    const labels = await listLabels();
    const label = labels.find((l) => l.id === task.labelId)?.name;
    const blocks = board.tasks.filter((t) => t.blockers.some((l) => l.taskId === task.id));
    const events = (await listEvents(board.project.id)).filter((e) => e.taskId === task.id).slice(0, 10);

    const out = [
      `# [${board.ref(task)}] ${task.title}`,
      '',
      [
        `Project: ${board.project.name} (#${board.project.code})`,
        `Column: ${stageLabel(task.status)}${isBlocked(task, board.byId) ? ' (BLOCKED)' : ''}`,
        `Type: ${task.type === 'bug' ? 'Bug' : 'Feature'}`,
        `Owner: ${task.assignee}`,
        task.dueDate ? `Due: ${task.dueDate}${task.dueTime ? ` ${task.dueTime}` : ''} (${dueLabel(task, now)})` : 'No due date',
        label && `Label: ${label}`,
        `Context health: ${contextHealth(task).score}/100`,
        `Id: ${task.id}`,
      ]
        .filter(Boolean)
        .map((f) => `- ${f}`)
        .join('\n'),
    ];
    if (task.description.trim()) out.push('', '## Description', task.description.trim());

    out.push('', '## Blocked by');
    const links = task.blockers.filter((l) => board.byId.has(l.taskId));
    out.push(
      links.length
        ? links
            .map((l) => {
              const b = board.byId.get(l.taskId)!;
              const state = isLinkBlocking(l, board.byId) ? 'blocking' : l.active ? 'resolved' : 'not active';
              return `- [${board.ref(b)}] ${b.title} (${stageLabel(b.status)}, ${state})`;
            })
            .join('\n')
        : '_Nothing._',
    );
    out.push('', '## Blocks', blocks.length ? blocks.map((t) => line(board, t)).join('\n') : '_Nothing._');

    out.push('', `## Stored AI context${task.contextTool ? ` (${task.contextTool})` : ''}${task.contextUpdatedAt ? `, updated ${when(task.contextUpdatedAt)} UTC` : ''}`);
    out.push(hasContext(task.context) ? task.context.trim() : '_No context recorded yet._');

    out.push('', `## Prompt history (${task.prompts.length}, newest first)`);
    out.push(
      task.prompts.length
        ? task.prompts
            .slice(0, 10)
            .map((p, i) => `### Prompt #${task.prompts.length - i} · ${when(p.createdAt)}${p.tool ? ` · ${p.tool}` : ''}\n${clip(p.prompt.trim(), 2000)}`)
            .join('\n\n') + (task.prompts.length > 10 ? `\n\n_${task.prompts.length - 10} older prompts not shown._` : '')
        : '_No prompts logged._',
    );

    out.push('', `## Outcomes (${task.outcomes.length}, oldest first)`);
    out.push(task.outcomes.length ? task.outcomes.map((o) => outcomeLine(task, o)).join('\n') : '_No outcomes recorded._');

    out.push('', '## History');
    out.push(events.length ? events.map((e) => `- ${when(e.at)} · ${e.actor} ${describeEvent(e.kind, e.from, e.to)}`).join('\n') : '_No history._');
    return { text: out.join('\n') + '\n', summary: `Read ${board.ref(task)}`, detail: { projectId: board.project.id, taskId: task.id } };
  },

  async get_task_briefing(args, ctx) {
    const { board, task } = await resolveTask(ctx, str(args, 'task')!);
    return { text: formatBriefing(task, board.project.code), summary: `Read the ${board.ref(task)} briefing`, detail: { projectId: board.project.id, taskId: task.id } };
  },

  async search_tasks(args, ctx) {
    const projects = str(args, 'project') ? [await resolveProject(ctx, str(args, 'project')!)] : await visibleProjects(ctx);
    const query = str(args, 'query')?.toLowerCase();
    const assignee = str(args, 'assignee')?.toLowerCase();
    const results: string[] = [];
    for (const project of projects) {
      const board = await loadBoard(project);
      for (const t of board.tasks) {
        if (query && ![t.title, t.description, t.context].some((s) => s.toLowerCase().includes(query))) continue;
        if (args.status && t.status !== args.status) continue;
        if (assignee && !t.assignee.toLowerCase().includes(assignee)) continue;
        if (args.blocked === true && !isBlocked(t, board.byId)) continue;
        results.push(line(board, t));
      }
    }
    const shown = results.slice(0, 50);
    return {
      text: shown.length ? `${results.length} task${results.length === 1 ? '' : 's'} found:\n\n${shown.join('\n')}${results.length > 50 ? '\n\n_Showing the first 50._' : ''}\n` : 'No tasks match.\n',
      summary: `Searched tasks (${results.length} found)`,
    };
  },

  async get_activity(args, ctx) {
    const board = await loadBoard(await resolveProject(ctx, str(args, 'project')!));
    const limit = typeof args.limit === 'number' ? args.limit : 20;
    const events = (await listEvents(board.project.id)).slice(0, limit);
    const name = (id: string) => {
      const t = board.byId.get(id);
      return t ? `[${board.ref(t)}] ${t.title}` : 'a deleted task';
    };
    const rows = events.map((e) => `- ${when(e.at)} · ${e.actor} ${describeEvent(e.kind, e.from, e.to)}: ${name(e.taskId)}`);
    return {
      text: `# Activity on ${board.project.name} (#${board.project.code}), newest first\n\n${rows.join('\n') || '_No activity yet._'}\n`,
      summary: `Read ${board.project.code} activity`,
      detail: { projectId: board.project.id },
    };
  },

  async get_outcomes(args, ctx) {
    const board = await loadBoard(await resolveProject(ctx, str(args, 'project')!));
    const only = str(args, 'task') ? (await resolveTask(ctx, str(args, 'task')!, board)).task : null;
    const tasks = (only ? [only] : board.tasks).filter((t) => t.outcomes.length);
    const all = tasks.flatMap((t) => t.outcomes);
    const ok = all.filter((o) => o.result === 'success').length;
    const tree = tasks.map((t) => `- [${board.ref(t)}] ${t.title}\n${t.outcomes.map((o) => `  ${outcomeLine(t, o)}`).join('\n')}`);
    return {
      text:
        `# Outcomes on ${board.project.name} (#${board.project.code})${only ? `, [${board.ref(only)}]` : ''}\n\n` +
        (all.length ? `${ok} successful, ${all.length - ok} unsuccessful.\n\n${tree.join('\n')}\n` : '_No outcomes recorded yet._\n'),
      summary: `Read ${only ? board.ref(only) : board.project.code} outcomes`,
      detail: { projectId: board.project.id },
    };
  },

  async record_outcome(args, ctx) {
    const { board, task } = await resolveTask(ctx, str(args, 'task')!);
    // AI connections may only record outcomes on the Demo Board, and only on a person's explicit instruction.
    if (!board.project.isDemo) {
      throw new InvalidInput('AI connections can only record outcomes on the Demo Board. Ask the person to record it themselves in the task.');
    }
    const instruction = str(args, 'operator_instruction')!.trim();
    if (instruction.length < 10) {
      throw new InvalidInput('Only record an outcome when the person explicitly asks, and pass their exact words as operator_instruction.');
    }
    if (instruction.length > 1000) throw new InvalidInput('Keep operator_instruction to 1000 characters or fewer.');

    const subject = args.about as OutcomeSubject;
    let promptId: string | null = null;
    let what = 'context';
    if (subject === 'prompt') {
      if (!task.prompts.length) throw new InvalidInput(`[${board.ref(task)}] has no prompts logged.`);
      const n = typeof args.prompt === 'number' ? args.prompt : task.prompts.length; // default: the latest
      const prompt = task.prompts[task.prompts.length - n];
      if (!prompt) throw new InvalidInput(`[${board.ref(task)}] has prompts #1 to #${task.prompts.length}.`);
      promptId = prompt.id;
      what = `prompt #${n}`;
    }
    const id = await insertOutcome(supabase(), {
      taskId: task.id,
      projectId: board.project.id,
      subject,
      promptId,
      result: args.result as OutcomeResult,
      reason: str(args, 'reason')!,
      recordedBy: ctx.caller,
      memberId: ctx.memberId,
      source: 'ai',
      operatorInstruction: instruction,
    });
    touch(board.project.id);
    const ref = board.ref(task);
    const verdict = args.result === 'success' ? 'successful' : 'unsuccessful';
    return {
      text: `Recorded the ${what} of [${ref}] ${task.title} as ${verdict}. The person can review or edit it in the task's Outcomes section.\n`,
      summary: `Recorded ${ref} ${what} as ${verdict}`,
      detail: { projectId: board.project.id, taskId: task.id, outcomeId: id },
    };
  },

  async get_deliverables(args, ctx) {
    const project = await resolveProject(ctx, str(args, 'project')!);
    const links = await getDeliverables(project.id);
    const rows = DELIVERABLES.map((k) => `- ${k[0].toUpperCase() + k.slice(1)}: ${links[k] || '_not set_'}`);
    return { text: `# Links for ${project.name} (#${project.code})\n\n${rows.join('\n')}\n`, summary: `Read ${project.code} links`, detail: { projectId: project.id } };
  },

  async move_task(args, ctx) {
    const { board, task } = await resolveTask(ctx, str(args, 'task')!);
    const text = await moveOne(ctx, board, task, args.to as Status, args.force === true);
    touch(board.project.id);
    return { text: `${text}\n\n${columnSummary(board)}\n`, summary: text, detail: { projectId: board.project.id, taskId: task.id } };
  },

  async move_tasks(args, ctx) {
    const moves = args.moves as { task: string; to: Status }[];
    const done: string[] = [];
    const failed: string[] = [];
    const boards = new Map<string, Board>();
    let last: Board | undefined;
    for (const move of moves) {
      try {
        const { board, task } = await resolveTask(ctx, move.task, last);
        last = boards.get(board.project.id) ?? board;
        boards.set(board.project.id, last);
        done.push(await moveOne(ctx, last, last.byId.get(task.id)!, move.to, args.force === true));
      } catch (err) {
        if (!(err instanceof InvalidInput)) throw err;
        failed.push(`${move.task}: ${err.message}`);
      }
    }
    for (const id of boards.keys()) touch(id);
    const text = [
      done.length ? `Done (${done.length}):\n${done.map((d) => `- ${d}`).join('\n')}` : 'Nothing was moved.',
      failed.length ? `Not moved (${failed.length}):\n${failed.map((f) => `- ${f}`).join('\n')}` : '',
      ...[...boards.values()].map((b) => `${b.project.code} now:\n${columnSummary(b)}`),
    ].filter(Boolean);
    return {
      text: text.join('\n\n') + '\n',
      summary: `Moved ${done.length} of ${moves.length} tasks`,
      detail: boards.size === 1 ? { projectId: [...boards.keys()][0] } : undefined,
    };
  },

  async hand_off_task(args, ctx) {
    const { board, task } = await resolveTask(ctx, str(args, 'task')!);
    const wanted = str(args, 'to')!.trim().toLowerCase();
    const members = await listMembers();
    const partial = members.filter((m) => m.name.toLowerCase().includes(wanted));
    const member = members.find((m) => m.name.toLowerCase() === wanted) ?? (partial.length === 1 ? partial[0] : undefined);
    if (!member) throw new InvalidInput(`No one called "${str(args, 'to')}". Team members: ${members.map((m) => m.name).join(', ')}.`);
    const ref = board.ref(task);
    if (task.assignee === member.name) return { text: `[${ref}] is already owned by ${member.name}.\n`, summary: `${ref} already with ${member.name}` };
    const { error } = await setTaskAssignee(supabase(), task.id, board.project.id, member.name, ctx.caller);
    if (error) throw new Error(error.message);
    touch(board.project.id);
    return {
      text: `Handed [${ref}] ${task.title} from ${task.assignee} to ${member.name}.\n`,
      summary: `Handed ${ref} to ${member.name}`,
      detail: { projectId: board.project.id, taskId: task.id },
    };
  },

  async add_blocker(args, ctx) {
    const { board, task } = await resolveTask(ctx, str(args, 'task')!);
    const { task: blocker } = await resolveTask(ctx, str(args, 'blocker')!, board);
    if (!board.byId.has(blocker.id)) throw new InvalidInput('Blocking tasks must be in the same project.');
    const db = supabase();
    const existing = await currentBlockerIds(db, task.id);
    const ref = board.ref(task);
    const bref = board.ref(blocker);
    if (existing.includes(blocker.id)) return { text: `[${bref}] already blocks [${ref}].\n`, summary: `${bref} already blocks ${ref}` };
    await assertValidBlockers(db, board.project.id, task.id, [...existing, blocker.id]);
    const { error } = await db.from('task_dependencies').insert({ task_id: task.id, depends_on: blocker.id, active: true });
    if (error) throw new Error(error.message);
    touch(board.project.id);
    return {
      text: `[${ref}] ${task.title} is now blocked by [${bref}] ${blocker.title} (${stageLabel(blocker.status)}).\n`,
      summary: `${bref} now blocks ${ref}`,
      detail: { projectId: board.project.id, taskId: task.id },
    };
  },

  async remove_blocker(args, ctx) {
    const { board, task } = await resolveTask(ctx, str(args, 'task')!);
    const { task: blocker } = await resolveTask(ctx, str(args, 'blocker')!, board);
    const ref = board.ref(task);
    const bref = board.ref(blocker);
    if (!task.blockers.some((l) => l.taskId === blocker.id)) return { text: `[${bref}] doesn't block [${ref}].\n`, summary: `${bref} didn't block ${ref}` };
    const { error } = await supabase().from('task_dependencies').delete().eq('task_id', task.id).eq('depends_on', blocker.id);
    if (error) throw new Error(error.message);
    touch(board.project.id);
    return { text: `[${bref}] no longer blocks [${ref}].\n`, summary: `${bref} no longer blocks ${ref}`, detail: { projectId: board.project.id, taskId: task.id } };
  },

  async log_prompt(args, ctx) {
    const { board, task } = await resolveTask(ctx, str(args, 'task')!);
    const prompt = str(args, 'prompt')!.trim();
    if (!prompt) throw new InvalidInput('The prompt is empty.');
    const { error } = await supabase().from('task_prompts').insert({ task_id: task.id, tool: str(args, 'tool') ?? null, prompt });
    if (error) throw new Error(error.message);
    touch(board.project.id);
    const ref = board.ref(task);
    const count = task.prompts.length + 1;
    return {
      text: `Logged the prompt on [${ref}] ${task.title}. It now has ${count} prompt${count === 1 ? '' : 's'}.\n`,
      summary: `Logged a prompt on ${ref}`,
      detail: { projectId: board.project.id, taskId: task.id },
    };
  },

  async update_context(args, ctx) {
    const { board, task } = await resolveTask(ctx, str(args, 'task')!);
    const context = str(args, 'context')!.trim();
    const tool = str(args, 'tool') ?? task.contextTool;
    const db = supabase();
    const ref = board.ref(task);
    if (context === task.context.trim() && tool === task.contextTool) return { text: `[${ref}] already has that context.\n`, summary: `${ref} context unchanged` };

    // Keep the old version so the change can be undone from the Connect page.
    const { data: saved, error: saveError } = await db
      .from('task_context_history')
      .insert({ task_id: task.id, context: task.context, context_tool: task.contextTool, replaced_by: ctx.caller })
      .select('id')
      .single();
    if (saveError) throw new Error(saveError.message);
    const { error } = await db
      .from('tasks')
      .update({ context, context_tool: tool, context_updated_at: new Date().toISOString() })
      .eq('id', task.id);
    if (error) throw new Error(error.message);
    touch(board.project.id);
    return {
      text: `Updated the context of [${ref}] ${task.title}. The previous version was saved and can be restored in the app.\n`,
      summary: `Updated the ${ref} context`,
      detail: { projectId: board.project.id, taskId: task.id, historyId: saved.id },
    };
  },
};

/** Move one task (already resolved on `board`), keeping `board` in step. Returns a one-line result. */
async function moveOne(ctx: CallerContext, board: Board, task: BoardTask, to: Status, force: boolean) {
  const ref = board.ref(task);
  if (task.status === to) return `[${ref}] is already in ${stageLabel(to)}.`;
  assertCanMove(board, task, to, force);
  const from = task.status;
  const { error } = await setTaskStatus(supabase(), task.id, board.project.id, to, ctx.caller);
  if (error) throw new Error(error.message);
  task.status = to;
  return `Moved [${ref}] ${task.title}: ${stageLabel(from)} → ${stageLabel(to)}.`;
}

function outcomeLine(task: BoardTask, o: TaskOutcome) {
  const verdict = o.result === 'success' ? 'SUCCESSFUL' : 'UNSUCCESSFUL';
  const by = `${o.recordedBy}${o.source === 'ai' ? " on a person's instruction" : ''}, ${when(o.createdAt)}`;
  return `- ${verdict} · ${outcomeSubjectLabel(task, o)} · ${o.reason.replace(/\s+/g, ' ').trim()} (${by})`;
}

function describeEvent(kind: string, from: string | null, to: string | null) {
  if (kind === 'created') return `created it in ${stageLabel(to)}`;
  if (kind === 'moved') return `moved it ${stageLabel(from)} → ${stageLabel(to)}`;
  return `handed it off ${from ?? '—'} → ${to ?? '—'}`;
}

/**
 * Run a tool for a caller: validate the input, check write permission, run it and log the call.
 * Problems with the input come back as `ok: false` with a message the AI can act on.
 */
export async function runTool(name: string, rawArgs: unknown, ctx: CallerContext): Promise<ToolResult> {
  const info = toolInfo(name);
  const run = TOOLS[name];
  if (!info || !run) return { ok: false, text: `Unknown tool "${name}".` };

  let output: ToolOutput;
  try {
    if (info.write && !ctx.canWrite) throw new InvalidInput('This connection is read-only. Create one that can move tasks on the Connect page.');
    const parsed = z.object(inputShape(name)).safeParse(rawArgs ?? {});
    if (!parsed.success) {
      throw new InvalidInput(parsed.error.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`).join('; '));
    }
    output = await run(parsed.data, ctx);
  } catch (err) {
    const message = err instanceof InvalidInput ? err.message : 'Something went wrong on the server. Please try again.';
    if (!(err instanceof InvalidInput)) console.error(`MCP tool ${name} failed:`, err);
    await recordCall(ctx, { tool: name, summary: clip(message, 200), ok: false });
    return { ok: false, text: message };
  }
  await recordCall(ctx, { tool: name, summary: output.summary, ok: true, detail: output.detail });
  return { ok: true, text: clip(output.text, MAX_OUTPUT) };
}

/** Text for the pick_up_task prompt: the task in full, plus how to hand back. */
export async function pickUpTaskPrompt(taskRef: string, ctx: CallerContext) {
  const { board, task } = await resolveTask(ctx, taskRef);
  const detail = await runTool('get_task', { task: taskRef }, ctx);
  const ref = board.ref(task);
  const finish = ctx.canWrite
    ? `When you stop, call update_context on ${ref} with an updated context (Background, Constraints, Tried so far, Pick up), log_prompt for the prompts you used, and move_task if its column changed.`
    : 'This connection is read-only, so tell me what to update in the tracker when you stop.';
  return `I'm picking up task [${ref}] from the Vibe Tracker board. Here is everything stored about it:\n\n${detail.text}\n\nContinue from the "Pick up" section of the context. If it's blocked, start with what blocks it. ${finish}`;
}

/** Tools this caller may use (read-only connections don't see the write tools). */
export function toolsFor(ctx: CallerContext) {
  return TOOL_CATALOG.filter((t) => ctx.canWrite || !t.write);
}
