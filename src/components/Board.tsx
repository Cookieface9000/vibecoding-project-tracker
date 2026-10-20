import TaskCard from '@/components/TaskCard';
import { STAGES, type BoardTask, type Status } from '@/lib/types';

// Coloured underline per stage (DESIGN.md §2): grey → blue → violet → green.
const STAGE_BAR: Record<Status, string> = {
  todo: 'bg-stage-todo',
  'in-progress': 'bg-stage-progress',
  review: 'bg-stage-review',
  done: 'bg-stage-done',
};

const URGENCY_LEGEND = [
  { label: 'On track', dot: 'bg-due-safe' },
  { label: 'Due < 24 h', dot: 'bg-due-warning' },
  { label: 'Overdue', dot: 'bg-due-overdue' },
  { label: 'Done', dot: 'bg-due-neutral' },
];

export default function Board({ tasks, projectCode }: { tasks: BoardTask[]; projectCode: string }) {
  return (
    <>
      {/* TODO: "Add task" button + edit-on-click modal, wired to app/actions.ts. */}
      <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
        <ul aria-label="Task urgency" className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          {URGENCY_LEGEND.map((item) => (
            <li key={item.label} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} aria-hidden />
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {STAGES.map((stage) => {
          const columnTasks = tasks.filter((t) => t.status === stage.id);
          return (
            <section key={stage.id} aria-labelledby={`col-${stage.id}`} className="flex min-w-0 flex-col">
              <h2
                id={`col-${stage.id}`}
                className="px-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-700 dark:text-slate-200"
              >
                {stage.label} <span className="font-normal text-slate-400">({columnTasks.length})</span>
              </h2>
              <div className={`mb-4 mt-3 h-[3px] rounded-full ${STAGE_BAR[stage.id]}`} />
              <div className="flex flex-col gap-2">
                {columnTasks.length === 0 ? (
                  <p className="flex h-[88px] items-center justify-center rounded-md border border-dashed border-slate-300 text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
                    Nothing here yet.
                  </p>
                ) : (
                  columnTasks.map((task) => <TaskCard key={task.id} task={task} projectCode={projectCode} />)
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
