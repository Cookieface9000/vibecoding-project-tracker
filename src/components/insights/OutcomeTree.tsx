import { Bot, CheckCircle2, ChevronRight, XCircle } from 'lucide-react';
import Link from 'next/link';
import { outcomeSubjectLabel } from '@/lib/outcome-labels';
import type { BoardTask } from '@/lib/types';

// The project's outcome log as a tree: project → task → each recorded outcome (oldest first),
// so you can see which prompts and contexts worked and why. Every node links to the task,
// opened on that outcome and ready to edit (Board reads ?task=…&outcome=…).

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const branch =
  'relative pl-6 before:absolute before:left-0 before:top-[13px] before:h-px before:w-4 before:bg-line-strong';

export default function OutcomeTree({ projectId, projectCode, tasks }: { projectId: string; projectCode: string; tasks: BoardTask[] }) {
  const withOutcomes = tasks.filter((t) => t.outcomes.length > 0);
  const all = withOutcomes.flatMap((t) => t.outcomes);
  const successes = all.filter((o) => o.result === 'success').length;
  const href = (taskId: string, outcomeId?: string) => `/projects/${projectId}?task=${taskId}${outcomeId ? `&outcome=${outcomeId}` : ''}`;

  if (all.length === 0) {
    return (
      <p className="border border-dashed border-line-strong px-3 py-6 text-center text-[13px] text-fg-subtle">
        No outcomes recorded yet. Open a task and use <strong className="text-fg">Record an outcome</strong> after trying a prompt or its context.
      </p>
    );
  }

  return (
    <div className="text-[13px]">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-medium text-fg">
        <span className="font-mono">#{projectCode}</span>
        <span className="inline-flex items-center gap-1 text-ink-safe">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          {successes} successful
        </span>
        <span className="inline-flex items-center gap-1 text-ink-overdue">
          <XCircle className="h-3.5 w-3.5" aria-hidden />
          {all.length - successes} unsuccessful
        </span>
        <span className="text-fg-subtle">across {withOutcomes.length} {withOutcomes.length === 1 ? 'task' : 'tasks'}</span>
      </p>

      <ul className="ml-2 mt-2 space-y-3 border-l border-line-strong pt-1" aria-label="Outcomes by task">
        {withOutcomes.map((t) => {
          const ok = t.outcomes.filter((o) => o.result === 'success').length;
          return (
            <li key={t.id} className={branch}>
              <Link href={href(t.id)} className="group inline-flex max-w-full items-center gap-2 rounded px-1 py-0.5 hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                <span className="font-mono text-[12px] font-semibold text-brand-ink">{t.ref}</span>
                <span className="truncate font-medium text-fg">{t.title}</span>
                <span className="shrink-0 text-[11px] text-fg-subtle">
                  {ok} ✓ · {t.outcomes.length - ok} ✗
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-fg-subtle opacity-0 group-hover:opacity-100" aria-hidden />
              </Link>

              <ul className="ml-3 mt-1 space-y-1 border-l border-line pt-0.5">
                {t.outcomes.map((o) => (
                  <li key={o.id} className={branch}>
                    <Link
                      href={href(t.id, o.id)}
                      title="Open this outcome in its task to read or edit it"
                      className="flex items-start gap-2 rounded px-1 py-1 hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      {o.result === 'success' ? (
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-safe" aria-label="Successful" />
                      ) : (
                        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-overdue" aria-label="Unsuccessful" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 text-[12px]">
                          <span className={`font-semibold ${o.result === 'success' ? 'text-ink-safe' : 'text-ink-overdue'}`}>
                            {o.result === 'success' ? 'Successful' : 'Unsuccessful'}
                          </span>
                          <span className="rounded bg-muted px-1.5 font-mono text-[11px] text-fg-muted">{outcomeSubjectLabel(t, o)}</span>
                          <span className="inline-flex items-center gap-1 text-fg-subtle">
                            {o.source === 'ai' && <Bot className="h-3 w-3" aria-label="Recorded by an AI on a person's instruction" />}
                            {o.recordedBy} · {dateFmt.format(new Date(o.createdAt))}
                          </span>
                        </span>
                        <span className="mt-0.5 line-clamp-2 text-fg-muted">{o.reason}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
