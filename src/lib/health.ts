import type { BoardTask } from './types';

// Context health: how ready a task is to be picked up by someone (or some AI) else.
// 0–100 from the four template sections, the AI tool, and prompt history.

export interface HealthCheck {
  id: 'background' | 'constraints' | 'tried' | 'pickup' | 'tool' | 'prompts';
  label: string;
  points: number;
  met: boolean;
}

const SECTIONS: { id: HealthCheck['id']; label: string; heading: RegExp }[] = [
  { id: 'background', label: 'Background', heading: /\*\*Background\*\*/i },
  { id: 'constraints', label: 'Constraints', heading: /\*\*Constraints\*\*/i },
  { id: 'tried', label: 'Tried so far', heading: /\*\*Tried so far\*\*/i },
  { id: 'pickup', label: 'Pick up', heading: /\*\*Pick up\*\*/i },
];

/** Text under a **Heading** up to the next **Heading** (or end), with list dashes removed. */
function sectionText(context: string, heading: RegExp): string {
  const match = heading.exec(context);
  if (!match) return '';
  const rest = context.slice(match.index + match[0].length);
  const next = rest.search(/\n\s*\*\*[^*]+\*\*/);
  return (next === -1 ? rest : rest.slice(0, next)).replace(/^\s*-\s*$/gm, '').trim();
}

export function contextHealth(task: Pick<BoardTask, 'context' | 'contextTool' | 'prompts'>): {
  score: number;
  checks: HealthCheck[];
} {
  const checks: HealthCheck[] = [
    ...SECTIONS.map((s) => ({ id: s.id, label: s.label, points: 20, met: sectionText(task.context, s.heading).length >= 3 })),
    { id: 'tool', label: 'AI tool noted', points: 10, met: Boolean(task.contextTool) },
    { id: 'prompts', label: 'Prompt history', points: 10, met: task.prompts.length > 0 },
  ];
  return { score: checks.reduce((sum, c) => sum + (c.met ? c.points : 0), 0), checks };
}

export type HealthBand = 'strong' | 'partial' | 'weak';

export function healthBand(score: number): HealthBand {
  if (score >= 70) return 'strong';
  if (score >= 30) return 'partial';
  return 'weak';
}

export const HEALTH_LABEL: Record<HealthBand, string> = {
  strong: 'Ready to hand off',
  partial: 'Some context',
  weak: 'Needs context',
};

/** Average health across tasks that aren't done (done work doesn't need a briefing). */
export function averageHealth(tasks: Pick<BoardTask, 'context' | 'contextTool' | 'prompts' | 'status'>[]): number | null {
  const open = tasks.filter((t) => t.status !== 'done');
  if (open.length === 0) return null;
  return Math.round(open.reduce((sum, t) => sum + contextHealth(t).score, 0) / open.length);
}
