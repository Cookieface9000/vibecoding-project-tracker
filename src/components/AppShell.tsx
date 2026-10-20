import { BookOpen, LayoutGrid, Plus } from 'lucide-react';
import Link from 'next/link';
import SettingsButton from '@/components/settings/SettingsButton';
import Collapsible from '@/components/Collapsible';
import { listMyTeams, listProjects } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { Project, Team } from '@/lib/types';

// Quiet, dark sidebar: workspace, navigation, projects, settings.
const navItem =
  'flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';
const navIdle = 'text-sidebar-fg-muted hover:bg-sidebar-hover hover:text-sidebar-fg';
const navActive = 'bg-sidebar-active text-sidebar-fg shadow-[inset_2px_0_0_rgb(var(--brand))]';

export default async function AppShell({
  activeProjectId,
  allProjectsActive = false,
  guideActive = false,
  children,
}: {
  activeProjectId?: string;
  allProjectsActive?: boolean;
  guideActive?: boolean;
  children: React.ReactNode;
}) {
  let projects: Project[] = [];
  let teams: Team[] = [];
  if (isSupabaseConfigured()) {
    try {
      [projects, teams] = await Promise.all([listProjects(), listMyTeams()]);
    } catch {
      /* the page itself shows the error */
    }
  }

  // Projects = personal (no team). Teams = your teams + teams owned by others.
  const personal = projects.filter((p) => !p.teamId);
  const ownedTeams = teams.filter((t) => t.role === 'owner');
  const otherTeams = teams.filter((t) => t.role !== 'owner');
  const projectsOf = (teamId: string) => projects.filter((p) => p.teamId === teamId);

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-line bg-sidebar md:flex">
        {/* Workspace */}
        <div className="flex h-14 items-center gap-2.5 px-4">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-[11px] font-bold text-brand-fg"
            aria-hidden
          >
            V
          </span>
          <span className="text-[14px] font-semibold tracking-[-0.01em] text-sidebar-fg">Vibe Tracker</span>
        </div>

        <div className="px-3">
          <Link
            href="/projects/new"
            className="flex h-8 w-full items-center gap-2 rounded-md border border-sidebar-line bg-sidebar-hover px-2.5 text-[13px] font-medium text-sidebar-fg transition-colors hover:bg-sidebar-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Plus className="h-4 w-4 text-sidebar-fg-muted" aria-hidden />
            New project
          </Link>
        </div>

        <nav aria-label="Main" className="mt-4 px-3">
          <Link href="/" aria-current={allProjectsActive ? 'page' : undefined} className={`${navItem} ${allProjectsActive ? navActive : navIdle}`}>
            <LayoutGrid className="h-4 w-4" aria-hidden />
            All projects
          </Link>
          <Link href="/guide" aria-current={guideActive ? 'page' : undefined} className={`${navItem} ${guideActive ? navActive : navIdle} mt-px`}>
            <BookOpen className="h-4 w-4" aria-hidden />
            Guide
          </Link>
        </nav>

        <nav aria-label="Projects and teams" className="mt-5 flex-1 space-y-2 overflow-y-auto px-3 pb-4">
          {/* Projects: your personal projects (not in a team). */}
          <Collapsible
            variant="sidebar"
            storageKey="side.projects"
            title="Projects"
            meta={<span className="tabular text-[10px] text-sidebar-fg-muted">{personal.length}</span>}
          >
            {personal.length === 0 ? (
              <p className="px-2 py-1 text-[12px] text-sidebar-fg-muted">No personal projects</p>
            ) : (
              <ProjectLinks projects={personal} activeProjectId={activeProjectId} />
            )}
          </Collapsible>

          {/* Teams: teams you own, then teams owned by someone else. */}
          <Collapsible
            variant="sidebar"
            storageKey="side.teams"
            title="Teams"
            meta={<span className="tabular text-[10px] text-sidebar-fg-muted">{teams.length}</span>}
          >
            {teams.length === 0 && <p className="px-2 py-1 text-[12px] text-sidebar-fg-muted">Not in any teams</p>}

            {ownedTeams.length > 0 && (
              <Collapsible variant="sidebar-sub" storageKey="side.your-teams" title="Your teams">
                {ownedTeams.map((team) => (
                  <div key={team.id} className="mb-1">
                    <p className="truncate px-2 pb-0.5 pt-1 text-[11px] text-sidebar-fg-muted" title={`${team.name} · ${team.code}`}>
                      {team.name}
                    </p>
                    <ProjectLinks projects={projectsOf(team.id)} activeProjectId={activeProjectId} />
                  </div>
                ))}
              </Collapsible>
            )}

            {otherTeams.map((team) => (
              <Collapsible
                key={team.id}
                variant="sidebar-sub"
                storageKey={`side.team.${team.id}`}
                title={`${team.ownerName ?? 'Someone'}'s team`}
              >
                <p className="truncate px-2 pb-0.5 pt-1 text-[11px] text-sidebar-fg-muted" title={`${team.name} · ${team.code}`}>
                  {team.name}
                </p>
                <ProjectLinks projects={projectsOf(team.id)} activeProjectId={activeProjectId} />
              </Collapsible>
            ))}
          </Collapsible>
        </nav>

        {/* Settings cog, pinned to the bottom of the sidebar. */}
        <div className="border-t border-sidebar-line px-3 py-2">
          <SettingsButton />
        </div>
      </aside>

      <div id="main" tabIndex={-1} className="flex min-w-0 flex-1 flex-col bg-canvas outline-none">
        {children}
      </div>
    </div>
  );
}

function ProjectLinks({ projects, activeProjectId }: { projects: Project[]; activeProjectId?: string }) {
  if (projects.length === 0) return <p className="px-2 py-1 text-[12px] text-sidebar-fg-muted">No projects yet</p>;
  return (
    <ul className="space-y-px">
      {projects.map((project) => {
        const active = project.id === activeProjectId;
        return (
          <li key={project.id}>
            <Link
              href={`/projects/${project.id}`}
              aria-current={active ? 'page' : undefined}
              title={project.isMine ? project.name : `${project.name} · by ${project.createdBy ?? 'a teammate'}`}
              className={`${navItem} ${active ? navActive : navIdle}`}
            >
              <span
                className={`flex h-5 min-w-[1.25rem] items-center justify-center rounded px-1 font-mono text-[10px] font-semibold ${
                  active ? 'bg-brand text-brand-fg' : 'bg-sidebar-active text-sidebar-fg-muted'
                }`}
                aria-hidden
              >
                {project.code.slice(0, 2)}
              </span>
              <span className="truncate">{project.name}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
