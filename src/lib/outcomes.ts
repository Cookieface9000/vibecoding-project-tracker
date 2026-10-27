import 'server-only';
import { InvalidInput, UUID, type Db } from './task-ops';
import { OUTCOME_RESULTS, type OutcomeResult, type OutcomeSubject } from './types';

// Recording task outcomes, shared by the web app (server actions) and AI connections (MCP).
// An outcome says whether a prompt, or the task's context, worked, and why.

export const REASON_MAX = 2000;

export function isOutcomeResult(value: unknown): value is OutcomeResult {
  return OUTCOME_RESULTS.some((r) => r.id === value);
}

export function cleanReason(raw: string) {
  const reason = raw.trim();
  if (!reason) throw new InvalidInput('Say why it was or wasn’t successful.');
  if (reason.length > REASON_MAX) throw new InvalidInput(`Keep the reason to ${REASON_MAX} characters or fewer.`);
  return reason;
}

export interface NewOutcome {
  taskId: string;
  projectId: string;
  subject: OutcomeSubject;
  promptId: string | null; // required when subject = 'prompt'
  result: OutcomeResult;
  reason: string;
  recordedBy: string;
  memberId: string | null;
  source: 'human' | 'ai';
  operatorInstruction?: string | null;
}

/** Validate and save an outcome. For context outcomes, the task's current context is kept with it. Returns the new id. */
export async function insertOutcome(db: Db, o: NewOutcome): Promise<string> {
  if (!UUID.test(o.taskId) || !UUID.test(o.projectId)) throw new InvalidInput('Invalid task.');
  if (o.subject !== 'context' && o.subject !== 'prompt') throw new InvalidInput('Choose whether this is about the context or a prompt.');
  if (!isOutcomeResult(o.result)) throw new InvalidInput('Choose Successful or Unsuccessful.');
  const reason = cleanReason(o.reason);

  const { data: task } = await db.from('tasks').select('context').eq('id', o.taskId).eq('project_id', o.projectId).maybeSingle();
  if (!task) throw new InvalidInput('That task is no longer on this board.');

  let contextSnapshot: string | null = null;
  if (o.subject === 'prompt') {
    if (!o.promptId || !UUID.test(o.promptId)) throw new InvalidInput('Choose which prompt this is about.');
    const { data: prompt } = await db.from('task_prompts').select('id').eq('id', o.promptId).eq('task_id', o.taskId).maybeSingle();
    if (!prompt) throw new InvalidInput('That prompt isn’t in this task’s history.');
  } else {
    if (!task.context.trim()) throw new InvalidInput('This task has no context yet. Add one before recording how it went.');
    contextSnapshot = task.context;
  }

  const { data, error } = await db
    .from('task_outcomes')
    .insert({
      task_id: o.taskId,
      project_id: o.projectId,
      subject: o.subject,
      prompt_id: o.subject === 'prompt' ? o.promptId : null,
      context_snapshot: contextSnapshot,
      result: o.result,
      reason,
      recorded_by: o.recordedBy,
      member_id: o.memberId,
      source: o.source,
      operator_instruction: o.operatorInstruction ?? null,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}
