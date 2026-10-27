import { notFound } from 'next/navigation';
import Board from '@/components/Board';
import DemoBanner from '@/components/connect/DemoBanner';
import DeliverablesBar from '@/components/DeliverablesBar';
import Notice, { SetupNotice } from '@/components/Notice';
import ProjectHeader from '@/components/ProjectHeader';
import { getDeliverables, getProject, listLabels, listMembers, listTasks } from '@/lib/data';
import { averageHealth } from '@/lib/health';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { BoardTask, Deliverables, Label, Member, Project } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ task?: string; outcome?: string }>;
}) {
  const [{ id }, { task: openTask, outcome: focusOutcome }] = await Promise.all([params, searchParams]);

  if (!isSupabaseConfigured()) {
    return (
      <>
        <main className="p-6">
          <SetupNotice />
        </main>
      </>
    );
  }

  let project: Project | null;
  let tasks: BoardTask[] = [];
  let members: Member[] = [];
  let labels: Label[] = [];
  let links: Deliverables = { presentation: '', demo: '', report: '', documentation: '' };
  try {
    // Start what doesn't need the project while it loads (only used if the project is visible).
    const early = Promise.all([listMembers(), listLabels(), getDeliverables(id)]);
    early.catch(() => {}); // a failure is reported below, when awaited
    project = await getProject(id);
    if (project) [tasks, [members, labels, links]] = await Promise.all([listTasks(project), early]);
  } catch (err) {
    return (
      <>
        <main className="p-6">
          <Notice>{(err as Error).message}</Notice>
        </main>
      </>
    );
  }
  if (!project) notFound();

  return (
    <>
      <ProjectHeader project={project} active="board" health={averageHealth(tasks)} />
      {/* pr-16 keeps the board clear of the pinned "Total context" tab on the right edge. */}
      <main className="flex-1 py-5 pl-6 pr-16">
        {project.isDemo && <DemoBanner />}
        <DeliverablesBar projectId={project.id} links={links} />
        <Board
          tasks={tasks}
          members={members}
          labels={labels}
          projectId={project.id}
          projectCode={project.code}
          project={{ name: project.name, code: project.code, client: project.client, description: project.description, teamName: project.teamName }}
          openTaskId={tasks.some((t) => t.id === openTask) ? openTask : undefined}
          focusOutcomeId={focusOutcome}
        />
      </main>
    </>
  );
}
