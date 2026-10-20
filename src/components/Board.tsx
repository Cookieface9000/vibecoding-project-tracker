'use client';

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core';
import { Pencil, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { handOffTask, moveTask } from '@/app/actions';
import { STAGES, type BoardTask, type Label, type Member, type Status } from '@/lib/types';
import EditPicker from './EditPicker';
import Modal, { btn } from './Modal';
import TaskCard, { TaskCardBody } from './TaskCard';
import TaskDetails from './TaskDetails';
import TaskForm from './TaskForm';
import Toast, { type ToastMessage } from './Toast';
import { initials } from './task-style';

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

type ModalState =
  | { kind: 'view'; id: string }
  | { kind: 'edit'; id: string; from: 'view' | 'pick' }
  | { kind: 'create'; status: Status }
  | { kind: 'pick' }
  | null;

const stageLabel = (id: unknown) => STAGES.find((s) => s.id === id)?.label ?? 'column';

// Pointer: whichever column the cursor is in. Keyboard: nearest overlap.
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

// Keyboard: ← / → jump a whole column (the default only nudges 25 px).
const columnKeyboardCoordinates: KeyboardCoordinateGetter = (event, { context }) => {
  const { active, over, collisionRect, droppableRects } = context;
  if (!collisionRect || (event.code !== 'ArrowLeft' && event.code !== 'ArrowRight')) return undefined;
  event.preventDefault();

  const order = STAGES.map((s) => s.id);
  const current = order.indexOf((over?.id ?? active?.data.current?.status) as Status);
  const next = Math.max(0, Math.min(order.length - 1, current + (event.code === 'ArrowRight' ? 1 : -1)));
  const rect = droppableRects.get(order[next]);
  if (!rect) return undefined;
  return { x: rect.left + (rect.width - collisionRect.width) / 2, y: rect.top + 8 };
};

export default function Board({
  tasks: serverTasks,
  members,
  labels,
  projectId,
  projectCode,
}: {
  tasks: BoardTask[];
  members: Member[];
  labels: Label[];
  projectId: string;
  projectCode: string;
}) {
  // Local copy for optimistic drag-and-drop; resyncs whenever the server sends fresh data.
  const [tasks, setTasks] = useState(serverTasks);
  useEffect(() => setTasks(serverTasks), [serverTasks]);

  const [modal, setModal] = useState<ModalState>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [handingOff, setHandingOff] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const justDropped = useRef(false);

  /** "Hand off to…": reassign straight away, confirm with a toast, roll back on failure. */
  function handOff(task: BoardTask, assignee: string) {
    const before = tasks;
    setTasks((current) => current.map((t) => (t.id === task.id ? { ...t, assignee } : t)));
    setHandingOff(true);
    startTransition(async () => {
      const result = await handOffTask(task.id, projectId, assignee);
      setHandingOff(false);
      if (result.ok) {
        setToast({ kind: 'ok', text: `Handed off to ${assignee}.`, id: Date.now() });
      } else {
        setTasks(before);
        setToast({ kind: 'error', text: result.error, id: Date.now() });
      }
    });
  }

  // M7: who is driving what — open (not done) tasks per person.
  const driving = members
    .map((m) => ({ name: m.name, count: tasks.filter((t) => t.assignee === m.name && t.status !== 'done').length }))
    .filter((d) => d.count > 0);

  const labelById = useMemo(() => new Map(labels.map((l) => [l.id, l])), [labels]);
  const labelOf = (task: BoardTask) => (task.labelId ? labelById.get(task.labelId) : undefined);

  // Global keyboard shortcuts (Settings → Keyboard shortcuts) talk to the board via events.
  useEffect(() => {
    const newTask = () => setModal((m) => m ?? { kind: 'create', status: 'todo' });
    const editTask = () => setModal((m) => m ?? { kind: 'pick' });
    window.addEventListener('vt:new-task', newTask);
    window.addEventListener('vt:edit-task', editTask);
    return () => {
      window.removeEventListener('vt:new-task', newTask);
      window.removeEventListener('vt:edit-task', editTask);
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), // small move = click, not drag
    useSensor(KeyboardSensor, {
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] },
      coordinateGetter: columnKeyboardCoordinates,
    }),
  );

  const activeTask = tasks.find((t) => t.id === activeId) ?? null;
  const modalTask = modal && (modal.kind === 'view' || modal.kind === 'edit') ? tasks.find((t) => t.id === modal.id) : undefined;
  const close = () => setModal(null);

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
    setError(null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    justDropped.current = true;
    setTimeout(() => (justDropped.current = false), 0);

    const id = String(e.active.id);
    const to = e.over?.id as Status | undefined;
    const task = tasks.find((t) => t.id === id);
    if (!task || !to || task.status === to) return;

    const before = tasks;
    // Move to the end of the target column straight away; roll back if the save fails.
    setTasks((current) => [...current.filter((t) => t.id !== id), { ...task, status: to }]);
    startTransition(async () => {
      const result = await moveTask(id, projectId, to);
      if (!result.ok) {
        setTasks(before);
        setError(result.error);
      }
    });
  }

  function open(id: string) {
    if (!justDropped.current) setModal({ kind: 'view', id });
  }

  const formProps = { projectId, projectCode, members, labels };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setModal({ kind: 'create', status: 'todo' })} className={btn.secondary}>
            <Plus className="h-4 w-4 text-brand dark:text-brand-dark" aria-hidden />
            Add task
          </button>
          <button type="button" onClick={() => setModal({ kind: 'pick' })} className={btn.secondary} disabled={tasks.length === 0}>
            <Pencil className="h-4 w-4 text-brand dark:text-brand-dark" aria-hidden />
            Edit task
          </button>
        </div>
        <ul aria-label="Task urgency" className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          {URGENCY_LEGEND.map((item) => (
            <li key={item.label} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} aria-hidden />
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      {driving.length > 0 && (
        <section aria-label="Who's driving what" className="mb-5 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Driving</span>
          {driving.map((d) => (
            <span
              key={d.name}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white py-0.5 pl-0.5 pr-2.5 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[9px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200" aria-hidden>
                {initials(d.name)}
              </span>
              {d.name}
              <span className="text-slate-400">
                · {d.count} open
              </span>
            </span>
          ))}
        </section>
      )}

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </p>
      )}

      <DndContext
        id="board"
        sensors={sensors}
        collisionDetection={collision}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
        accessibility={{
          announcements: {
            onDragStart: ({ active }) => `Picked up ${tasks.find((t) => t.id === active.id)?.title}.`,
            onDragOver: ({ over }) => (over ? `Over ${stageLabel(over.id)}.` : 'Not over a column.'),
            onDragEnd: ({ over }) => (over ? `Moved to ${stageLabel(over.id)}.` : 'Dropped. No change.'),
            onDragCancel: () => 'Move cancelled.',
          },
          screenReaderInstructions: {
            draggable: 'Press Space to pick up the task, left and right arrows to choose a column, Space to drop, Escape to cancel.',
          },
        }}
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {STAGES.map((stage) => (
            <Column
              key={stage.id}
              id={stage.id}
              label={stage.label}
              tasks={tasks.filter((t) => t.status === stage.id)}
              labelOf={labelOf}
              onOpen={open}
              onAdd={() => setModal({ kind: 'create', status: stage.id })}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask && <TaskCardBody task={activeTask} label={labelOf(activeTask)} lifted />}
        </DragOverlay>
      </DndContext>

      {modal?.kind === 'create' && (
        <Modal labelledBy="new-task" onClose={close}>
          <TaskForm {...formProps} defaultStatus={modal.status} onDone={close} onCancel={close} />
        </Modal>
      )}
      {modal?.kind === 'pick' && (
        <Modal labelledBy="pick-task" onClose={close}>
          <EditPicker
            tasks={tasks}
            labelOf={labelOf}
            onPick={(id) => setModal({ kind: 'edit', id, from: 'pick' })}
            onClose={close}
          />
        </Modal>
      )}
      {modal?.kind === 'view' && modalTask && (
        <Modal labelledBy={`task-title-${modalTask.id}`} onClose={close}>
          <TaskDetails
            task={modalTask}
            taskLabel={labelOf(modalTask)}
            projectCode={projectCode}
            members={members}
            handingOff={handingOff}
            onHandOff={(assignee) => handOff(modalTask, assignee)}
            onEdit={() => setModal({ kind: 'edit', id: modalTask.id, from: 'view' })}
            onClose={close}
          />
        </Modal>
      )}
      {modal?.kind === 'edit' && modalTask && (
        <Modal labelledBy={`edit-task-${modalTask.id}`} onClose={close}>
          <TaskForm
            {...formProps}
            task={modalTask}
            onDone={close}
            onCancel={() => setModal(modal.from === 'pick' ? { kind: 'pick' } : { kind: 'view', id: modalTask.id })}
          />
        </Modal>
      )}

      <Toast toast={toast} onDone={clearToast} />
    </>
  );
}

function Column({
  id,
  label,
  tasks,
  labelOf,
  onOpen,
  onAdd,
}: {
  id: Status;
  label: string;
  tasks: BoardTask[];
  labelOf: (task: BoardTask) => Label | undefined;
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <section aria-labelledby={`col-${id}`} className="flex min-w-0 flex-col">
      <h2 id={`col-${id}`} className="px-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-700 dark:text-slate-200">
        {label} <span className="font-normal text-slate-400">({tasks.length})</span>
      </h2>
      <div className={`mb-4 mt-3 h-[3px] rounded-full ${STAGE_BAR[id]}`} />

      {/* Drop zone: highlights while a ticket is dragged over it. */}
      <div
        ref={setNodeRef}
        className={`-m-1.5 flex min-h-[120px] flex-1 flex-col gap-2 rounded-lg p-1.5 transition-colors ${
          isOver ? 'bg-brand/[0.07] ring-2 ring-inset ring-brand/40 dark:bg-brand-dark/10' : ''
        }`}
      >
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} label={labelOf(task)} onOpen={() => onOpen(task.id)} />
        ))}
        <button
          type="button"
          onClick={onAdd}
          className="flex h-9 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-slate-500 hover:bg-white hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-brand-dark"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add task
        </button>
      </div>
    </section>
  );
}
