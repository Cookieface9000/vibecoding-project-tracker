import type { Task } from './types';

// Pre-filled into new tasks' Context field.
export const CONTEXT_TEMPLATE = `## Context
**Background**


**Constraints**
-

**Tried so far**


**Pick up**
`;

/** True when the context holds more than the untouched template. */
export function hasContext(context: string) {
  const text = context.trim();
  return text.length > 0 && text !== CONTEXT_TEMPLATE.trim();
}

/** The Markdown briefing copied to the clipboard, ready to paste into any AI tool. */
export function formatBriefing(task: Pick<Task, 'title' | 'description' | 'context'>, projectCode?: string) {
  const parts = [`# ${projectCode ? `[#${projectCode}] ` : ''}${task.title}`];
  if (task.description.trim()) parts.push(task.description.trim());
  if (hasContext(task.context)) parts.push(task.context.trim());
  return parts.join('\n\n') + '\n';
}
