import { notFound } from 'next/navigation';
import AppShell from '@/components/AppShell';
import HealthMeter from '@/components/HealthMeter';
import DependencyGraph from '@/components/insights/DependencyGraph';
import HandoffMap from '@/components/insights/HandoffMap';
import PromptTimeline from '@/components/insights/PromptTimeline';
import Notice, { SetupNotice } from '@/components/Notice';
import ProjectHeader from '@/components/ProjectHeader';
import { isBlocked } from '@/lib/blocking';
import { getProject, listEvents, listTasks } from '@/lib/data';
import { HEALTH_LABEL, averageHealth, contextHealth, healthBand } from '@/lib/health';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { BoardTask, Project, TaskEvent } from '@/lib/types';

export const dynamic = 'force-dynamic';

const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;

export default async function InsightsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <main className="p-6">
          <SetupNotice />
        </main>
      </AppShell>
    );
  }

  let project: Project | null;
  let tasks: BoardTask[] = [];
  let events: TaskEvent[] = [];
  try {
    project = await getProject(id);
    if (project) [tasks, events] = await Promise.all([listTasks(project.id), listEvents(project.id)]);
  } catch (err) {
    return (
      <AppShell activeProjectId={id}>
        <main className="p-6">
          <Notice>{(err as Error).message}</Notice>
        </main>
      </AppShell>
    );
  }
  if (!project) notFound();

  const since = Date.now() - FOURTEEN_DAYS;
  const open = tasks.filter((t) => t.status !== 'done');
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const blocked = open.filter((t) => isBlocked(t, byId));
  const prompts14 = tasks.flatMap((t) => t.prompts).filter((p) => new Date(p.createdAt).getTime() >= since).length;
  const handoffs14 = events.filter((e) => e.kind === 'handoff' && new Date(e.at).getTime() >= since).length;
  const health = averageHealth(tasks);
  const needsContext = open
    .map((t) => ({ t, h: contextHealth(t) }))
    .sort((a, b) => a.h.score - b.h.score)
    .slice(0, 5);

  return (
    <AppShell activeProjectId={project.id}>
      <ProjectHeader project={project} active="insights" health={health} />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-6 py-6">
        {/* KPIs */}
        <dl className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-5">
          <Kpi label="Open tasks" value={open.length} />
          <Kpi label="Blocked" value={blocked.length} tone={blocked.length ? 'bad' : undefined} />
          <Kpi label="Prompts · 14 days" value={prompts14} />
          <Kpi label="Handoffs · 14 days" value={handoffs14} />
          <div className="bg-surface p-4">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">Avg context health</dt>
            <dd className="mt-2">
              <HealthMeter score={health} label={false} />
            </dd>
          </div>
        </dl>

        <div className="grid gap-6 lg:grid-cols-5">
          <Panel className="lg:col-span-3" title="Prompt timeline" subtitle="Prompts logged per day, by AI tool. Spikes show where the work got hard.">
            <PromptTimeline tasks={tasks} />
          </Panel>
          <Panel className="lg:col-span-2" title="Needs context" subtitle="Open tasks least ready to hand to someone (or an AI) else.">
            {needsContext.length === 0 ? (
              <p className="text-[13px] text-fg-subtle">No open tasks.</p>
            ) : (
              <ol className="divide-y divide-line border border-line">
                {needsContext.map(({ t, h }) => (
                  <li key={t.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-fg">{t.title}</p>
                      <p className="truncate text-[12px] text-fg-subtle">
                        {HEALTH_LABEL[healthBand(h.score)]} · missing {h.checks.filter((c) => !c.met).map((c) => c.label.toLowerCase()).join(', ') || 'nothing'}
                      </p>
                    </div>
                    <HealthMeter score={h.score} label={false} />
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <Panel className="lg:col-span-2" title="Handoff map" subtitle="Who handed work to whom. Thicker arrows = more handoffs.">
            <HandoffMap events={events} tasks={tasks} />
          </Panel>
          <Panel className="lg:col-span-3" title="Dependencies" subtitle="What's blocking what, by stage. Red arrows are still blocking.">
            <DependencyGraph tasks={tasks} />
          </Panel>
        </div>
      </main>
    </AppShell>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: 'bad' }) {
  return (
    <div className="bg-surface p-4">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">{label}</dt>
      <dd className={`mt-1 tabular text-[24px] font-semibold tracking-[-0.02em] ${tone === 'bad' ? 'text-ink-overdue' : 'text-fg'}`}>{value}</dd>
    </div>
  );
}

function Panel({ title, subtitle, className = '', children }: { title: string; subtitle: string; className?: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className={`border border-line bg-surface p-5 motion-safe:animate-rise-in ${className}`}>
      <h2 className="text-[14px] font-semibold text-fg">{title}</h2>
      <p className="mb-4 mt-0.5 text-[12px] text-fg-subtle">{subtitle}</p>
      {children}
    </section>
  );
}
