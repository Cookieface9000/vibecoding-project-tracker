import { Building2, ChevronRight, User, Users } from 'lucide-react';
import Link from 'next/link';
import HealthMeter from '@/components/HealthMeter';
import PageHeader from '@/components/PageHeader';
import { PROJECT_STATUSES, type Project, type ProjectStatus } from '@/lib/types';

// Status meanings (DESIGN.md): green = good, amber = attention, grey = closed.
export const STATUS_STYLE: Record<ProjectStatus, { dot: string; className: string }> = {
  active: { dot: 'bg-green-500', className: 'text-fg-muted' },
  'on-hold': { dot: 'bg-amber-500', className: 'text-fg-muted' },
  completed: { dot: 'bg-fg-subtle', className: 'text-fg-subtle' },
};

export function StatusPill({ status }: { status: ProjectStatus }) {
  const style = STATUS_STYLE[status];
  const label = PROJECT_STATUSES.find((s) => s.id === status)?.label;
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center gap-1.5 border border-line px-2 text-[11px] uppercase tracking-[0.04em] font-medium ${style.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden />
      {label}
    </span>
  );
}

export default function ProjectHeader({
  project,
  active,
  health,
}: {
  project: Project;
  active: 'board' | 'insights';
  health: number | null;
}) {
  const tab = (key: 'board' | 'insights', href: string, label: string) => (
    <Link
      href={href}
      aria-current={active === key ? 'page' : undefined}
      className={
        active === key
          ? 'border-b-2 border-fg pb-2 font-medium text-fg'
          : 'border-b-2 border-transparent pb-2 text-fg-subtle hover:text-fg'
      }
    >
      {label}
    </Link>
  );
  return (
    <>
      <PageHeader>
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
          <Link href="/" className="text-fg-subtle hover:text-fg">
            Projects
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-fg-muted">
            {project.code}
          </span>
          <h1 className="truncate font-semibold text-fg">{project.name}</h1>
        </nav>
        <StatusPill status={project.status} />
        <span className="hidden items-center gap-1 text-[13px] text-fg-subtle md:inline-flex">
          {project.teamName ? <Users className="h-3.5 w-3.5" aria-hidden /> : <User className="h-3.5 w-3.5" aria-hidden />}
          {project.teamName ?? 'Personal'}
          <span aria-hidden>·</span>
          {project.isMine ? 'Created by you' : `Created by ${project.createdBy ?? 'a teammate'}`}
        </span>
        {project.client && (
          <span className="hidden items-center gap-1 text-[13px] text-fg-subtle sm:inline-flex">
            <Building2 className="h-3.5 w-3.5" aria-hidden />
            {project.client}
          </span>
        )}
      </PageHeader>

      <nav
        aria-label="Project sections"
        className="flex h-10 shrink-0 items-end gap-5 border-b border-line bg-surface px-6 text-[13px]"
      >
        {tab('board', `/projects/${project.id}`, 'Board')}
        {tab('insights', `/projects/${project.id}/insights`, 'Insights')}
        <span className="ml-auto self-center">
          <HealthMeter score={health} />
        </span>
      </nav>
    </>
  );
}
