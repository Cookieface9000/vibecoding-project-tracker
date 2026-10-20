import AppShell from '@/components/AppShell';
import NewProjectForm from '@/components/NewProjectForm';
import { SetupNotice } from '@/components/Notice';
import ThemeToggle from '@/components/ThemeToggle';
import { isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default function NewProjectPage() {
  return (
    <AppShell>
      <header className="flex items-center justify-between border-b border-slate-200 bg-surface-header px-6 py-5 dark:border-slate-800 dark:bg-surface-header-dark">
        <div>
          <h1 className="font-heading text-2xl font-medium text-slate-900 dark:text-white">New project</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            A project gets its own board, task context, and pinned links.
          </p>
        </div>
        <ThemeToggle />
      </header>
      <main className="flex-1 p-6">{isSupabaseConfigured() ? <NewProjectForm /> : <SetupNotice />}</main>
    </AppShell>
  );
}
