import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import NewProjectForm from '@/components/NewProjectForm';
import { SetupNotice } from '@/components/Notice';
import PageHeader from '@/components/PageHeader';
import { listMyTeams } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { Team } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ team?: string }> }) {
  const { team } = await searchParams;
  let teams: Team[] = [];
  if (isSupabaseConfigured()) {
    try {
      teams = await listMyTeams();
    } catch {
      /* the form still works for personal projects */
    }
  }
  // ?team=<id> pre-selects a team (e.g. from a team section); default to your first team.
  const defaultTeamId = teams.find((t) => t.id === team)?.id ?? teams[0]?.id ?? '';

  return (
    <AppShell>
      <PageHeader>
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px]">
          <Link href="/" className="text-fg-subtle hover:text-fg">
            Projects
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-fg-subtle" aria-hidden />
          <h1 className="font-semibold text-fg">New project</h1>
        </nav>
      </PageHeader>
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
        <div className="mb-6">
          <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-fg">Create a project</h2>
          <p className="mt-1 text-[13px] text-fg-subtle">
            A project gets its own board, task context, and pinned links.
          </p>
        </div>
        {isSupabaseConfigured() ? <NewProjectForm teams={teams} defaultTeamId={defaultTeamId} /> : <SetupNotice />}
      </main>
    </AppShell>
  );
}
