import { isBlocked, isLinkBlocking } from './blocking';
import { hasContext } from './context';
import { dueLabel } from './due';
import { averageHealth, contextHealth } from './health';
import { STAGES, type BoardTask, type Label, type Project } from './types';

// "Total context": the whole board as one Markdown briefing for an AI tool or teammate.
// Every task is listed by stage with its own clearly labelled context block.

export function formatBoardContext(
  project: Pick<Project, 'name' | 'code' | 'client' | 'description' | 'teamName'>,
  tasks: BoardTask[],
  labels: Label[],
  { includePrompts }: { includePrompts: boolean },
): string {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const labelName = (id: string | null) => (id ? labels.find((l) => l.id === id)?.name : undefined);
  const ref = (t: BoardTask) => t.ref;
  const now = new Date();

  const open = tasks.filter((t) => t.status !== 'done');
  const blocked = tasks.filter((t) => isBlocked(t, byId));
  const overdue = open.filter((t) => dueLabel(t, now)?.includes('overdue') || dueLabel(t, now) === 'Overdue');
  const health = averageHealth(tasks);

  const lines: string[] = [];
  lines.push(`# Board context: ${project.name} (#${project.code})`);
  const meta = [project.teamName ? `Team: ${project.teamName}` : 'Personal project', project.client && `Client: ${project.client}`]
    .filter(Boolean)
    .join(' · ');
  lines.push('', meta);
  if (project.description) lines.push('', project.description);
  lines.push(
    '',
    '## Summary',
    `- ${tasks.length} tasks: ${STAGES.map((s) => `${tasks.filter((t) => t.status === s.id).length} ${s.label.toLowerCase()}`).join(', ')}`,
    `- ${overdue.length} overdue, ${blocked.length} blocked`,
    `- Average context health (open tasks): ${health === null ? 'n/a' : `${health}/100`}`,
    `- Generated ${now.toISOString().slice(0, 16).replace('T', ' ')} UTC`,
  );

  for (const stage of STAGES) {
    const stageTasks = tasks.filter((t) => t.status === stage.id);
    lines.push('', '---', '', `## ${stage.label} (${stageTasks.length})`);
    if (stageTasks.length === 0) {
      lines.push('', '_No tasks._');
      continue;
    }
    for (const t of stageTasks) {
      const facts = [
        t.type === 'bug' ? 'Bug' : 'Feature',
        `Owner: ${t.assignee}`,
        t.dueDate ? `Due: ${t.dueDate}${t.dueTime ? ` ${t.dueTime}` : ''} (${dueLabel(t, now)})` : 'No due date',
        labelName(t.labelId) && `Label: ${labelName(t.labelId)}`,
        `Context health: ${contextHealth(t).score}/100`,
      ].filter(Boolean);
      lines.push('', `### [${ref(t)}] ${t.title}`, facts.join(' · '));

      const links = t.blockers.filter((l) => byId.has(l.taskId));
      if (links.length) {
        const describe = (l: (typeof links)[number]) => {
          const b = byId.get(l.taskId)!;
          const state = isLinkBlocking(l, byId) ? 'blocking' : l.active ? 'resolved' : 'not active';
          return `[${ref(b)}] ${b.title} (${STAGES.find((s) => s.id === b.status)?.label}, ${state})`;
        };
        lines.push(`${isBlocked(t, byId) ? 'BLOCKED by' : 'Blocked by'}: ${links.map(describe).join('; ')}`);
      }
      if (t.description.trim()) lines.push('', `**Description:** ${t.description.trim()}`);

      lines.push('', `#### Context for [${ref(t)}]${t.contextTool ? ` (${t.contextTool})` : ''}`);
      lines.push(hasContext(t.context) ? stripTopHeading(t.context.trim()) : '_No context recorded yet._');

      if (includePrompts && t.prompts.length) {
        lines.push('', `#### Prompt history for [${ref(t)}] (newest first)`);
        for (const p of t.prompts) {
          lines.push(`- ${p.createdAt.slice(0, 10)}${p.tool ? ` · ${p.tool}` : ''}: ${p.prompt.replace(/\s+/g, ' ').trim()}`);
        }
      }
    }
  }
  return lines.join('\n') + '\n';
}

/** Context blocks start with "## Context"; inside the briefing the label above replaces it. */
function stripTopHeading(context: string) {
  return context.replace(/^##\s*Context\s*\n/i, '').trim();
}
