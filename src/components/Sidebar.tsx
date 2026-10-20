import { KanbanSquare } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-surface-sidebar px-3 py-4 dark:border-slate-800 dark:bg-surface-sidebar-dark md:flex">
      <div className="mb-6 flex items-center gap-2 px-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand font-heading text-sm font-bold text-white dark:bg-brand-dark dark:text-slate-900">
          V
        </span>
        <span className="font-heading text-base font-bold text-slate-900 dark:text-white">Vibe Tracker</span>
      </div>

      <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Project
      </p>
      <nav>
        <a
          href="/"
          aria-current="page"
          className="flex items-center gap-2 rounded-lg bg-brand/10 px-2 py-2 text-sm font-semibold text-brand dark:bg-brand-dark/15 dark:text-brand-dark"
        >
          <KanbanSquare className="h-4 w-4" />
          Kanban Board
        </a>
      </nav>
    </aside>
  );
}
