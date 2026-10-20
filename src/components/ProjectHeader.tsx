import { Activity, Building2, CheckCircle2, ChevronRight, PauseCircle, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import { PROJECT_STATUSES, type Project, type ProjectStatus } from '@/lib/types';

// Status pill colours follow DESIGN.md meanings: green = good, amber = attention, grey = closed.
export const STATUS_STYLE: Record<ProjectStatus, { Icon: LucideIcon; className: string }> = {
  active: { Icon: Activity, className: 'text-green-700 dark:text-green-400' },
  'on-hold': { Icon: PauseCircle, className: 'text-amber-700 dark:text-amber-400' },
  completed: { Icon: CheckCircle2, className: 'text-slate-500 dark:text-slate-400' },
};

export default function ProjectHeader({ project }: { project: Project }) {
  const status = STATUS_STYLE[project.status];
  const statusLabel = PROJECT_STATUSES.find((s) => s.id === project.status)?.label;

  return (
    <header className="border-b border-slate-200 bg-surface-header px-6 pt-5 dark:border-slate-800 dark:bg-surface-header-dark">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="mb-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <Link href="/" className="hover:text-slate-800 hover:underline dark:hover:text-slate-200">
              Projects
            </Link>
            <ChevronRight className="h-3 w-3" aria-hidden />
            <span className="truncate">{project.name}</span>
          </nav>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate font-heading text-2xl font-medium text-slate-900 dark:text-white">{project.name}</h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-800/60 ${status.className}`}
            >
              <status.Icon className="h-3.5 w-3.5" aria-hidden />
              {statusLabel}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="rounded border-l-2 border-brand bg-slate-100 px-1.5 font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              #{project.code}
            </span>
            {project.client && (
              <>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" aria-hidden />
                  {project.client}
                </span>
              </>
            )}
          </div>
        </div>
        <ThemeToggle />
      </div>

      <nav aria-label="Project sections" className="mt-4 flex gap-6 text-[15px]">
        <span
          aria-current="page"
          className="border-b-2 border-brand pb-2.5 font-medium text-brand dark:border-brand-dark dark:text-brand-dark"
        >
          Tasks
        </span>
      </nav>
    </header>
  );
}
