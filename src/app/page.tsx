import { AlarmClock, Building2, ChevronRight, FolderPlus, Plus } from 'lucide-react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import Notice, { SetupNotice } from '@/components/Notice';
import { STATUS_STYLE } from '@/components/ProjectHeader';
import ThemeToggle from '@/components/ThemeToggle';
import { listProjectSummaries, type ProjectSummary } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase';
import { PROJECT_STATUSES, STAGES, type Status } from '@/lib/types';

// Always render on request: data lives in Supabase, not in the build.
export const dynamic = 'force-dynamic';

const STAGE_SEGMENT: Record<Status, string> = {
  todo: 'bg-stage-todo',
  'in-progress': 'bg-stage-progress',
  review: 'bg-stage-review',
  done: 'bg-stage-done',
};

// Home: every project, each linking to its board.
export default async function ProjectsPage() {
  let content: React.ReactNode;

  if (!isSupabaseConfigured()) {
    content = <SetupNotice />;
  } else {
    try {
      const projects = await listProjectSummaries();
      content = projects.length === 0 ? <EmptyState /> : <ProjectList projects={projects} />;
    } catch (err) {
      content = (
        <Notice>
          {(err as Error).message}. Have you run <code>supabase/schema.sql</code> in the Supabase SQL editor?
        </Notice>
      );
    }
  }

  return (
    <AppShell allProjectsActive>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-surface-header px-6 py-5 dark:border-slate-800 dark:bg-surface-header-dark">
        <h1 className="font-heading text-2xl font-medium text-slate-900 dark:text-white">Projects</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/projects/new"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Plus className="h-4 w-4 text-brand dark:text-brand-dark" aria-hidden />
            New project
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="flex-1 p-6">{content}</main>
    </AppShell>
  );
}

function ProjectList({ projects }: { projects: ProjectSummary[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {projects.map((project) => {
        const total = Object.values(project.counts).reduce((a, b) => a + b, 0);
        const status = STATUS_STYLE[project.status];
        const statusLabel = PROJECT_STATUSES.find((s) => s.id === project.status)?.label;
        return (
          <li key={project.id} className="h-full">
            <Link
              href={`/projects/${project.id}`}
              className="group flex h-full flex-col rounded-xl border border-slate-200 bg-surface-card p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-[border-color,box-shadow] hover:border-brand/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 dark:border-slate-800 dark:bg-surface-card-dark dark:hover:border-brand-dark/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-heading text-lg font-medium text-slate-900 dark:text-white">{project.name}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <span className="rounded border-l-2 border-brand bg-slate-100 px-1.5 font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      #{project.code}
                    </span>
                    {project.client && (
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" aria-hidden />
                        {project.client}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium ${status.className}`}>
                  <status.Icon className="h-3.5 w-3.5" aria-hidden />
                  {statusLabel}
                </span>
              </div>

              {/* Fixed 2-line slot so every project card lines up. */}
              <p className="mb-4 mt-3 line-clamp-2 min-h-[2.5rem] text-sm text-slate-500 dark:text-slate-400">
                {project.description || 'No description.'}
              </p>

              {/* Stage breakdown bar: same stage colours as the board columns. */}
              <div className="mt-auto flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden>
                {total > 0 &&
                  STAGES.map((stage) =>
                    project.counts[stage.id] ? (
                      <span
                        key={stage.id}
                        className={STAGE_SEGMENT[stage.id]}
                        style={{ width: `${(project.counts[stage.id] / total) * 100}%` }}
                      />
                    ) : null,
                  )}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {total === 0
                    ? 'No tasks yet'
                    : STAGES.map((stage) => `${project.counts[stage.id]} ${stage.label.toLowerCase()}`).join(' · ')}
                </span>
                <span className="flex items-center gap-3">
                  {project.overdue > 0 && (
                    <span className="inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 font-medium text-red-800 dark:bg-red-500/15 dark:text-red-300">
                      <AlarmClock className="h-3 w-3" aria-hidden />
                      {project.overdue} overdue
                    </span>
                  )}
                  <span className="inline-flex items-center gap-0.5 font-medium text-brand group-hover:underline dark:text-brand-dark">
                    Open board <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto mt-16 max-w-sm text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand dark:text-brand-dark">
        <FolderPlus className="h-6 w-6" aria-hidden />
      </span>
      <h2 className="mt-4 font-heading text-xl font-semibold text-slate-900 dark:text-white">Create your first project</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Each project gets its own board of tickets, their AI context, and the links your stakeholders need.
      </p>
      <Link
        href="/projects/new"
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
      >
        New project
      </Link>
    </div>
  );
}
