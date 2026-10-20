import { notFound } from 'next/navigation';
import AppShell from '@/components/AppShell';
import Board from '@/components/Board';
import Notice, { SetupNotice } from '@/components/Notice';
import ProjectHeader from '@/components/ProjectHeader';
import { getProject, listTasks } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { BoardTask, Project } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
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
  try {
    project = await getProject(id);
    if (project) tasks = await listTasks(project.id);
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

  // TODO: pinned project links above the board (getDeliverables / setDeliverable).
  return (
    <AppShell activeProjectId={project.id}>
      <ProjectHeader project={project} />
      <main className="flex-1 p-6">
        <Board tasks={tasks} projectId={project.id} projectCode={project.code} />
      </main>
    </AppShell>
  );
}
