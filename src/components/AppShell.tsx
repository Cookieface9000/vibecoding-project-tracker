import { FolderKanban, LayoutGrid, Plus } from 'lucide-react';
import Link from 'next/link';
import { listProjects } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { Project } from '@/lib/types';

// Dark sidebar (projects + "New project") with the page content beside it.
export default async function AppShell({
  activeProjectId,
  allProjectsActive = false,
  children,
}: {
  activeProjectId?: string;
  allProjectsActive?: boolean;
  children: React.ReactNode;
}) {
  let projects: Project[] = [];
  if (isSupabaseConfigured()) {
    try {
      projects = await listProjects();
    } catch {
      /* the page itself shows the error */
    }
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col bg-surface-sidebar text-slate-300 dark:bg-surface-sidebar-dark md:flex">
        <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand font-heading text-base font-bold text-white">
            V
          </span>
          <span className="font-heading text-[17px] font-bold text-white">Vibe Tracker</span>
        </div>

        <div className="px-4">
          <Link
            href="/projects/new"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300"
          >
            <Plus className="h-4 w-4" aria-hidden />
            New project
          </Link>
        </div>

        <nav aria-label="Main" className="mt-6 px-3">
          <Link
            href="/"
            aria-current={allProjectsActive ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-md px-2 py-2 text-[15px] transition ${
              allProjectsActive ? 'bg-white/[0.06] font-medium text-brand-dark' : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
            }`}
          >
            <LayoutGrid className={`h-[18px] w-[18px] ${allProjectsActive ? 'text-brand-dark' : 'text-slate-500'}`} aria-hidden />
            All projects
          </Link>
        </nav>

        <p className="mb-2 mt-5 px-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Projects</p>
        <nav aria-label="Projects" className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-6">
          {projects.length === 0 && <p className="px-2 text-sm text-slate-500">No projects yet.</p>}
          {projects.map((project) => {
            const active = project.id === activeProjectId;
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-md px-2 py-2 text-[15px] transition ${
                  active ? 'bg-white/[0.06] font-medium text-brand-dark' : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <FolderKanban className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-brand-dark' : 'text-slate-500'}`} aria-hidden />
                <span className="truncate">{project.name}</span>
                <span className="ml-auto font-mono text-[11px] text-slate-500">#{project.code}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-surface-page dark:bg-surface-page-dark">{children}</div>
    </div>
  );
}
