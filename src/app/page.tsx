import { CheckCircle2, ChevronRight, Circle, CircleDashed, Eye, type LucideIcon } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import TaskCard from '@/components/TaskCard';
import ThemeToggle from '@/components/ThemeToggle';
import { listTasks } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase';
import { STAGES, type Status, type Task } from '@/lib/types';

// Always render on request: data lives in Supabase, not in the build.
export const dynamic = 'force-dynamic';

// Per-stage accent so each column reads differently at a glance (DESIGN.md §2).
const STAGE_STYLE: Record<Status, { Icon: LucideIcon; icon: string; bar: string; count: string }> = {
  todo: {
    Icon: Circle,
    icon: 'text-stage-todo',
    bar: 'bg-stage-todo',
    count: 'bg-stage-todo/15 text-slate-600 dark:text-slate-300',
  },
  'in-progress': {
    Icon: CircleDashed,
    icon: 'text-stage-progress',
    bar: 'bg-stage-progress',
    count: 'bg-stage-progress/15 text-blue-700 dark:text-blue-300',
  },
  review: {
    Icon: Eye,
    icon: 'text-stage-review',
    bar: 'bg-stage-review',
    count: 'bg-stage-review/15 text-purple-700 dark:text-purple-300',
  },
  done: {
    Icon: CheckCircle2,
    icon: 'text-stage-done',
    bar: 'bg-stage-done',
    count: 'bg-stage-done/15 text-emerald-700 dark:text-emerald-300',
  },
};

const URGENCY_LEGEND = [
  { label: '> 24 h', dot: 'bg-due-safe' },
  { label: '< 24 h', dot: 'bg-due-warning' },
  { label: 'Past due', dot: 'bg-due-overdue' },
  { label: 'Done', dot: 'bg-due-neutral' },
];

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

  // TODO: "Add task" button + edit-on-click modal, wired to ./actions.ts.
  // TODO: pinned project links above the board (getDeliverables / setDeliverable).
  return (
    <Shell>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAGES.map((stage) => {
          const style = STAGE_STYLE[stage.id];
          const columnTasks = tasks.filter((t) => t.status === stage.id);
          return (
            <section
              key={stage.id}
              aria-labelledby={`col-${stage.id}`}
              className="flex flex-col overflow-hidden rounded-2xl bg-surface-column dark:bg-surface-column-dark"
            >
              <div className={`h-1 ${style.bar}`} />
              <header className="flex items-center gap-2 px-3 pb-2 pt-3">
                <style.Icon className={`h-4 w-4 ${style.icon}`} aria-hidden />
                <h2 id={`col-${stage.id}`} className="font-heading text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                  {stage.label}
                </h2>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.count}`}>
                  {columnTasks.length}
                </span>
              </header>
              <div className="flex flex-1 flex-col gap-2.5 px-2.5 pb-3">
                {columnTasks.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
                    Nothing here yet.
                  </p>
                ) : (
                  columnTasks.map((task) => <TaskCard key={task.id} task={task} />)
                )}
              </div>
            </section>
          );
        })}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-surface-sidebar px-4 py-3 dark:border-slate-800 dark:bg-surface-sidebar-dark sm:px-6">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
            <span className="text-slate-400 dark:text-slate-500">Project</span>
            <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" aria-hidden />
            <span className="font-heading font-semibold text-slate-900 dark:text-white">Kanban Board</span>
          </nav>
          <div className="flex items-center gap-4">
            <ul aria-label="Task urgency" className="hidden items-center gap-3 text-xs text-slate-500 dark:text-slate-400 lg:flex">
              {URGENCY_LEGEND.map((item) => (
                <li key={item.label} className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} aria-hidden />
                  {item.label}
                </li>
              ))}
            </ul>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
      {children}
    </div>
  );
}
