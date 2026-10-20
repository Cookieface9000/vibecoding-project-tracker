import { notFound } from 'next/navigation';
import AppShell from '@/components/AppShell';
import Board from '@/components/Board';
import DeliverablesBar from '@/components/DeliverablesBar';
import Notice, { SetupNotice } from '@/components/Notice';
import ProjectHeader from '@/components/ProjectHeader';
import { getDeliverables, getProject, listLabels, listMembers, listTasks } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { BoardTask, Deliverables, Label, Member, Project } from '@/lib/types';

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
  let members: Member[] = [];
  let labels: Label[] = [];
  let links: Deliverables = { presentation: '', demo: '', report: '', documentation: '' };
  try {
    project = await getProject(id);
    if (project) [tasks, members, labels, links] = await Promise.all([
        listTasks(project.id),
        listMembers(),
        listLabels(),
        getDeliverables(project.id),
      ]);
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

  return (
    <AppShell activeProjectId={project.id}>
      <ProjectHeader project={project} />
      <main className="flex-1 p-6">
        <DeliverablesBar projectId={project.id} links={links} />
        <Board tasks={tasks} members={members} labels={labels} projectId={project.id} projectCode={project.code} />
      </main>
    </AppShell>
  );
}
