import { AlarmClock, ArrowUpRight, FolderPlus, Plus, User, Users } from 'lucide-react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import Collapsible from '@/components/Collapsible';
import { btn } from '@/components/ui';
import HealthMeter from '@/components/HealthMeter';
import Notice, { SetupNotice } from '@/components/Notice';
import PageHeader from '@/components/PageHeader';
import { StatusPill } from '@/components/ProjectHeader';
import { listMyTeams, listProjectSummaries, type ProjectSummary } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase';
import { STAGES, type Status, type Team } from '@/lib/types';

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
  let count: number | null = null;

  if (!isSupabaseConfigured()) {
    content = <SetupNotice />;
  } else {
    try {
      const [projects, teams] = await Promise.all([listProjectSummaries(), listMyTeams()]);
      count = projects.length;
      content = projects.length === 0 ? <EmptyState /> : <GroupedProjects projects={projects} teams={teams} />;
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
      <PageHeader
        actions={
          <Link href="/projects/new" className={btn.primary}>
            <Plus className="h-4 w-4" aria-hidden />
            New project
          </Link>
        }
      >
        <h1 className="text-[14px] font-semibold text-fg">Projects</h1>
        {count !== null && <span className="tabular text-[13px] text-fg-subtle">{count}</span>}
      </PageHeader>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">{content}</main>
    </AppShell>
  );
}

// All projects: "Projects" (personal) first, then "Teams" — your teams, then each team owned by someone else.
// Every section collapses with its ▾ toggle.
function GroupedProjects({ projects, teams }: { projects: ProjectSummary[]; teams: Team[] }) {
  const personal = projects.filter((p) => !p.teamId);
  const ownedTeams = teams.filter((t) => t.role === 'owner');
  const otherTeams = teams.filter((t) => t.role !== 'owner');
  const projectsOf = (teamId: string) =>
    projects
      .filter((p) => p.teamId === teamId)
      .sort((a, b) => Number(b.isMine) - Number(a.isMine) || a.name.localeCompare(b.name));
  const count = (n: number, one: string) => `${n} ${n === 1 ? one : one + 's'}`;

  return (
    <div className="space-y-10">
      <Collapsible
        storageKey="page.projects"
        title={
          <span className="flex items-center gap-2">
            <User className="h-4 w-4 text-fg-subtle" aria-hidden />
            Projects
          </span>
        }
        meta={<span className="text-[12px] text-fg-subtle">{count(personal.length, 'personal project')} · only you can see these</span>}
      >
        {personal.length === 0 ? (
          <p className="border border-dashed border-line-strong px-3 py-6 text-center text-[13px] text-fg-subtle">
            No personal projects. Choose “Personal (only you)” when creating a project.
          </p>
        ) : (
          <ProjectList projects={personal} />
        )}
      </Collapsible>

      <Collapsible
        storageKey="page.teams"
        title={
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-fg-subtle" aria-hidden />
            Team projects
          </span>
        }
        meta={<span className="text-[12px] text-fg-subtle">{count(teams.length, 'team')}</span>}
      >
        <div className="space-y-8 pl-1">
          {teams.length === 0 && (
            <p className="border border-dashed border-line-strong px-3 py-6 text-center text-[13px] text-fg-subtle">
              You&apos;re not in any teams. Join or create one in Settings → Teams.
            </p>
          )}

          {ownedTeams.length > 0 && (
            <Collapsible
              storageKey="page.your-teams"
              title="Your teams"
              meta={<span className="text-[12px] text-fg-subtle">{count(ownedTeams.length, 'team')} you own</span>}
            >
              <div className="space-y-6">
                {ownedTeams.map((team) => (
                  <TeamBlock key={team.id} team={team} projects={projectsOf(team.id)} />
                ))}
              </div>
            </Collapsible>
          )}

          {otherTeams.map((team) => (
            <Collapsible
              key={team.id}
              storageKey={`page.team.${team.id}`}
              title={`${team.ownerName ?? 'Someone'}'s team`}
              meta={<span className="text-[12px] text-fg-subtle">{team.name}</span>}
            >
              <TeamBlock team={team} projects={projectsOf(team.id)} />
            </Collapsible>
          ))}
        </div>
      </Collapsible>
    </div>
  );
}

function TeamBlock({ team, projects }: { team: Team; projects: ProjectSummary[] }) {
  return (
    <section aria-label={team.name}>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-[14px] font-semibold text-fg">{team.name}</h3>
        <span className="font-mono text-[12px] text-fg-subtle">{team.code}</span>
        <span className="text-[12px] text-fg-subtle">
          {team.memberCount} {team.memberCount === 1 ? 'member' : 'members'} · {team.role === 'owner' ? 'You own this team' : `Owned by ${team.ownerName ?? 'someone else'}`}
        </span>
        <Link href={`/projects/new?team=${team.id}`} className="ml-auto text-[12px] font-medium text-brand-ink hover:underline">
          + New project in {team.name}
        </Link>
      </div>
      {projects.length === 0 ? (
        <p className="border border-dashed border-line-strong px-3 py-6 text-center text-[13px] text-fg-subtle">No projects in this team yet.</p>
      ) : (
        <ProjectList projects={projects} />
      )}
    </section>
  );
}

function ProjectList({ projects }: { projects: ProjectSummary[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => {
        const total = Object.values(project.counts).reduce((a, b) => a + b, 0);
        const done = project.counts.done;
        return (
          <li key={project.id} className="h-full">
            <Link
              href={`/projects/${project.id}`}
              className="group flex h-full flex-col rounded-xl border border-line bg-surface p-5 transition-[border-color] hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted font-mono text-[12px] font-semibold text-fg-muted">
                    {project.code.slice(0, 3)}
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-fg">{project.name}</h2>
                    <p className="truncate text-[12px] text-fg-subtle">
                      #{project.code}
                      {project.client && ` · ${project.client}`}
                    </p>
                  </div>
                </div>
                <StatusPill status={project.status} />
              </div>

              {/* Who created it (yours vs. a teammate's) + average context health. */}
              <p className="mt-3 flex items-center justify-between gap-2 text-[12px]">
                {project.isMine ? (
                  <span className="inline-flex items-center gap-1 border border-brand bg-brand-soft px-1.5 py-0.5 font-medium text-brand-ink">
                    Yours
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 border border-line px-1.5 py-0.5 text-fg-muted">
                    By {project.createdBy ?? 'a teammate'}
                  </span>
                )}
                <HealthMeter score={project.health} label={false} />
              </p>

              {/* Fixed 2-line slot so every project card lines up. */}
              <p className="mb-5 mt-4 line-clamp-2 min-h-[2.5rem] text-[13px] leading-5 text-fg-subtle">
                {project.description || 'No description.'}
              </p>

              <div className="mt-auto">
                <div className="mb-2 flex items-center justify-between text-[12px] text-fg-subtle">
                  <span className="tabular">
                    {total === 0 ? 'No tasks yet' : `${done} of ${total} done`}
                  </span>
                  {project.overdue > 0 && (
                    <span className="inline-flex items-center gap-1 font-medium text-ink-overdue">
                      <AlarmClock className="h-3.5 w-3.5" aria-hidden />
                      {project.overdue} overdue
                    </span>
                  )}
                </div>
                {/* Stage breakdown: same stage colours as the board columns. */}
                <div className="flex h-1.5 gap-px overflow-hidden bg-muted" aria-hidden>
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
                <p className="sr-only">
                  {STAGES.map((stage) => `${project.counts[stage.id]} ${stage.label}`).join(', ')}
                </p>
              </div>

              <span className="mt-4 inline-flex items-center gap-1 text-[12px] font-medium text-fg-subtle group-hover:text-fg">
                Open board
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto mt-20 max-w-sm text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface text-fg-subtle shadow-card">
        <FolderPlus className="h-5 w-5" aria-hidden />
      </span>
      <h2 className="mt-4 text-[15px] font-semibold text-fg">Create your first project</h2>
      <p className="mt-1.5 text-[13px] text-fg-subtle">
        Each project gets its own board of tickets, their AI context, and the links your stakeholders need.
      </p>
      <Link href="/projects/new" className={`${btn.primary} mt-5`}>
        <Plus className="h-4 w-4" aria-hidden />
        New project
      </Link>
    </div>
  );
}
