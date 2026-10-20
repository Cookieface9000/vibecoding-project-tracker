import { listTasks } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase';
import { STAGES, type Task } from '@/lib/types';

// Always render on request: data lives in Supabase, not in the build.
export const dynamic = 'force-dynamic';

export default async function Home() {
  if (!isSupabaseConfigured()) {
    return (
      <Shell>
        <Notice>
          Supabase isn&apos;t configured. Set <code>SUPABASE_URL</code> and <code>SUPABASE_SECRET_KEY</code> in{' '}
          <code>.env</code>, then restart <code>npm run dev</code>.
        </Notice>
      </Shell>
    );
  }

  let tasks: Task[];
  try {
    tasks = await listTasks();
  } catch (err) {
    return (
      <Shell>
        <Notice>
          {(err as Error).message}. Have you run <code>supabase/schema.sql</code> in the Supabase SQL editor?
        </Notice>
      </Shell>
    );
  }

  // TODO M5 crud-modal: "+" button and edit-on-click modal, wired to the actions in ./actions.ts.
  // TODO M11 anchors: Deliverables board above the Kanban (getDeliverables / setDeliverable).
  return (
    <Shell>
      <main className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAGES.map((stage) => {
          const columnTasks = tasks.filter((t) => t.status === stage.id);
          return (
            <section key={stage.id} className="rounded-lg bg-slate-100 p-3">
              <h2 className="mb-3 text-sm font-semibold uppercase text-slate-600">
                {stage.label} <span className="text-slate-400">({columnTasks.length})</span>
              </h2>
              <ul className="space-y-2">
                {columnTasks.map((task) => (
                  <li key={task.id} className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-sm font-medium text-slate-900">{task.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{task.assignee}</p>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </main>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Vibecoding Project Tracker</h1>
      </header>
      {children}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{children}</div>
  );
}
