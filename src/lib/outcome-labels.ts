import type { BoardTask, TaskOutcome } from './types';

// Labels for outcomes, shared by the task view (client) and the Insights outcome tree (server).

/** Prompts are listed newest first; number them oldest = #1 so the numbers never shift. */
export function promptNumber(task: Pick<BoardTask, 'prompts'>, promptId: string | null) {
  const i = task.prompts.findIndex((p) => p.id === promptId);
  return i === -1 ? null : task.prompts.length - i;
}

export function outcomeSubjectLabel(task: Pick<BoardTask, 'prompts'>, o: Pick<TaskOutcome, 'subject' | 'promptId'>) {
  if (o.subject === 'context') return 'Context';
  const n = promptNumber(task, o.promptId);
  const prompt = task.prompts.find((p) => p.id === o.promptId);
  return n === null ? 'Prompt (deleted)' : `Prompt #${n}${prompt?.tool ? ` · ${prompt.tool}` : ''}`;
}
