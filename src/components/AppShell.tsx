import { BookOpen, LayoutGrid, Plug, Plus } from 'lucide-react';
import Link from 'next/link';
import SettingsButton from '@/components/settings/SettingsButton';
import { NavLink, ProjectLink } from '@/components/SidebarLinks';
import Collapsible from '@/components/Collapsible';
import ProfileButton from '@/components/ProfileButton';
import { getSignedInUser, type CurrentUser } from '@/lib/current-user';
import { listMyTeams, listProjects } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { Project, Team } from '@/lib/types';

// Quiet, dark sidebar: workspace, navigation, projects, settings.
// Rendered once by the root layout, so it stays on screen (and isn't re-fetched) as you move
// between pages; links highlight themselves from the URL (SidebarLinks).
export default async function AppShell({ children }: { children: React.ReactNode }) {
  let me: CurrentUser | null = null;
  let projects: Project[] = [];
  let teams: Team[] = [];
  if (isSupabaseConfigured()) {
    try {
      me = await getSignedInUser();
      if (me) [projects, teams] = await Promise.all([listProjects(), listMyTeams()]);
    } catch {
      /* the page itself shows the error */
    }
  }

  // Signed out: no sidebar, just the page (the sign-in page; src/proxy.ts redirects everything else there).
  if (isSupabaseConfigured() && !me) {
    return (
      <div id="main" tabIndex={-1} className="flex min-h-screen flex-col bg-canvas outline-none">
        {children}
      </div>
    );
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
          <NavLink href="/">
            <LayoutGrid className="h-4 w-4" aria-hidden />
            All projects
          </NavLink>
          <NavLink href="/guide" className="mt-px">
            <BookOpen className="h-4 w-4" aria-hidden />
            Guide
          </NavLink>
          <NavLink href="/connect" className="mt-px">
            <Plug className="h-4 w-4" aria-hidden />
            Connect an AI
          </NavLink>
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
              <ProjectLinks projects={personal} />
            )}
          </Collapsible>

          {/* Team projects: grouped by team, teams you own first, then teams owned by someone else. */}
          <Collapsible
            variant="sidebar"
            storageKey="side.teams"
            title="Team projects"
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
                    <ProjectLinks projects={projectsOf(team.id)} />
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
                <ProjectLinks projects={projectsOf(team.id)} />
              </Collapsible>
            ))}
          </Collapsible>
        </nav>

        {/* Who's signed in (opens their profile) + sign out, then the Settings cog. */}
        <div className="space-y-1 border-t border-sidebar-line px-3 py-2">
          {me && <ProfileButton name={me.name} username={me.username} avatar={me.avatar} />}
          <SettingsButton />
        </div>
      </aside>

      <div id="main" tabIndex={-1} className="flex min-w-0 flex-1 flex-col bg-canvas outline-none">
        {children}
      </div>
    </div>
  );
}

function ProjectLinks({ projects }: { projects: Project[] }) {
  if (projects.length === 0) return <p className="px-2 py-1 text-[12px] text-sidebar-fg-muted">No projects yet</p>;
  return (
    <ul className="space-y-px">
      {projects.map((project) => (
        <li key={project.id}>
          <ProjectLink
            id={project.id}
            code={project.code}
            name={project.name}
            mcp={project.isDemo}
            title={project.isMine ? project.name : `${project.name} · by ${project.createdBy ?? 'a teammate'}`}
          />
        </li>
      ))}
    </ul>
  );
}
