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
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { addBlocker, createBlockerTask, deleteAllTasks, handOffTask, moveTask, removeBlocker, type ActionResult } from '@/app/actions';
import { isBlocked } from '@/lib/blocking';
import { STAGES, type BoardTask, type Label, type Member, type Status } from '@/lib/types';
import EditPicker from './EditPicker';
import ClearBoardDialog from './ClearBoardDialog';
import Modal, { btn } from './Modal';
import TaskCard, { TaskCardBody } from './TaskCard';
import TaskDetails from './TaskDetails';
import TaskForm from './TaskForm';
import Toast, { type ToastMessage } from './Toast';
import TotalContext, { type BoardProjectInfo } from './TotalContext';
import Avatar from './Avatar';

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
  | { kind: 'clear' }
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
  project,
  openTaskId,
  focusOutcomeId,
}: {
  tasks: BoardTask[];
  members: Member[];
  labels: Label[];
  projectId: string;
  projectCode: string;
  project: BoardProjectInfo;
  openTaskId?: string; // from ?task=: open this task straight away (links from Insights)
  focusOutcomeId?: string; // from ?outcome=: and show this outcome in it, ready to edit
}) {
  // Local copy for optimistic drag-and-drop; resyncs whenever the server sends fresh data.
  // Cards that changed elsewhere (an AI connection, a teammate) and not on this page
  // are highlighted for a moment, so you can see what happened.
  const [tasks, setTasks] = useState(serverTasks);
  const [remoteIds, setRemoteIds] = useState<Set<string>>(new Set());
  const polled = useRef(false); // set when the background refresh (below) asked for this data
  useEffect(() => {
    const local = new Map(tasks.map((t) => [t.id, t]));
    const changed = polled.current
      ? serverTasks.filter((t) => {
          const mine = local.get(t.id);
          return mine && (mine.status !== t.status || mine.assignee !== t.assignee);
        })
      : [];
    polled.current = false;
    setTasks(serverTasks);
    if (changed.length === 0) return;
    setRemoteIds(new Set(changed.map((t) => t.id)));
    const timer = setTimeout(() => setRemoteIds(new Set()), 2600);
    return () => clearTimeout(timer);
    // Compare against the local copy as it was when the new data arrived.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverTasks]);

  const [modal, setModal] = useState<ModalState>(openTaskId ? { kind: 'view', id: openTaskId } : null);
  const [focusOutcome, setFocusOutcome] = useState(focusOutcomeId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [handingOff, setHandingOff] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const justDropped = useRef(false);
  // Motion cues: the card just dropped settles in; the card just handed off glows.
  const [settledId, setSettledId] = useState<string | null>(null);
  const [glowId, setGlowId] = useState<string | null>(null);

  // Pick up changes made elsewhere: refresh every 15 s while the tab is visible, and on
  // returning to it. Skipped mid-drag or while a task form is open.
  const router = useRouter();
  const busy = useRef(false);
  busy.current = activeId !== null || modal?.kind === 'edit' || modal?.kind === 'create';
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible' || busy.current) return;
      polled.current = true;
      router.refresh();
    };
    const timer = setInterval(refresh, 15_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [router]);

  // A task is blocked while any of its blockers isn't done.
  const blockedIds = useMemo(() => {
    const byId = new Map(tasks.map((t) => [t.id, t]));
    return new Set(tasks.filter((t) => isBlocked(t, byId)).map((t) => t.id));
  }, [tasks]);

  // Blockers managed from inside a task. Remove updates instantly and roll back on
  // failure; add/create wait for the server (which refreshes the board).
  const [blockerBusy, setBlockerBusy] = useState(false);
  function blockerAction(optimistic: ((ts: BoardTask[]) => BoardTask[]) | null, call: () => Promise<ActionResult>, okText: string) {
    const before = tasks;
    if (optimistic) setTasks(optimistic);
    setBlockerBusy(true);
    startTransition(async () => {
      const result = await call();
      setBlockerBusy(false);
      if (result.ok) {
        setToast({ kind: 'ok', text: okText, id: Date.now() });
      } else {
        if (optimistic) setTasks(before);
        setToast({ kind: 'error', text: result.error, id: Date.now() });
      }
    });
  }
  const blockerHandlers = (task: BoardTask) => ({
    busy: blockerBusy,
    onAdd: (blockerId: string) => blockerAction(null, () => addBlocker(task.id, projectId, blockerId), 'Blocker added.'),
    onCreate: (title: string) =>
      blockerAction(null, () => createBlockerTask(task.id, projectId, title), `Created “${title.trim()}” as a blocker.`),
    onRemove: (blockerId: string) =>
      blockerAction(
        (ts) =>
          ts.map((t) =>
            t.id === task.id
              ? { ...t, dependsOn: t.dependsOn.filter((d) => d !== blockerId), blockers: t.blockers.filter((b) => b.taskId !== blockerId) }
              : t,
          ),
        () => removeBlocker(task.id, projectId, blockerId),
        'Blocker removed.',
      ),
  });

  /** "Delete all": empty the board straight away, restore it if the server refuses. */
  const [clearing, setClearing] = useState(false);
  function clearBoard() {
    const before = tasks;
    setClearing(true);
    startTransition(async () => {
      const result = await deleteAllTasks(projectId);
      setClearing(false);
      if (result.ok) {
        setTasks([]);
        setModal(null);
        setToast({ kind: 'ok', text: `Deleted ${before.length} task${before.length === 1 ? '' : 's'}.`, id: Date.now() });
      } else {
        setToast({ kind: 'error', text: result.error, id: Date.now() });
      }
    });
  }

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
        setGlowId(task.id);
        setTimeout(() => setGlowId((g) => (g === task.id ? null : g)), 2600);
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
  const avatarOf = (name: string) => members.find((m) => m.name === name)?.avatar ?? null;

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
  const close = () => {
    setModal(null);
    setFocusOutcome(undefined);
    // Opened from a link (?task=…): drop it from the URL so a refresh doesn't reopen the task.
    if (window.location.search) window.history.replaceState(null, '', window.location.pathname);
  };

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
    setSettledId(id);
    setTimeout(() => setSettledId((s2) => (s2 === id ? null : s2)), 600);
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

  const formProps = { projectId, projectCode, members, labels, allTasks: tasks };

  return (
    <>
      {/* One toolbar row: actions left; who's driving + legend right. */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setModal({ kind: 'create', status: 'todo' })} className={btn.primary}>
            <Plus className="h-4 w-4" aria-hidden />
            New task
          </button>
          <button type="button" onClick={() => setModal({ kind: 'pick' })} className={btn.secondary} disabled={tasks.length === 0}>
            <Pencil className="h-3.5 w-3.5 text-fg-subtle" aria-hidden />
            Edit task
          </button>
          <button type="button" onClick={() => setModal({ kind: 'clear' })} className={btn.danger} disabled={tasks.length === 0}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Delete all
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-5">
          {driving.length > 0 && (
            <ul aria-label="Who's driving what" className="flex items-center gap-1.5">
              {driving.map((d) => (
                <li
                  key={d.name}
                  title={`${d.name} · ${d.count} open`}
                  className="inline-flex h-6 items-center gap-1 border border-line bg-surface pl-0.5 pr-2 text-[12px] font-medium text-fg-muted"
                >
                  <Avatar name={d.name} avatar={avatarOf(d.name)} size={20} />
                  <span className="tabular">{d.count}</span>
                  <span className="sr-only">{`${d.name}: ${d.count} open`}</span>
                </li>
              ))}
            </ul>
          )}
          <ul aria-label="Task urgency" className="flex flex-wrap items-center gap-3.5 text-[12px] text-fg-subtle">
            {URGENCY_LEGEND.map((item) => (
              <li key={item.label} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${item.dot}`} aria-hidden />
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {STAGES.map((stage) => (
            <Column
              key={stage.id}
              id={stage.id}
              label={stage.label}
              tasks={tasks.filter((t) => t.status === stage.id)}
              labelOf={labelOf}
              avatarOf={avatarOf}
              blockedIds={blockedIds}
              settledId={settledId}
              glowId={glowId}
              remoteIds={remoteIds}
              projectCode={projectCode}
              onOpen={open}
              onAdd={() => setModal({ kind: 'create', status: stage.id })}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask && <TaskCardBody task={activeTask} label={labelOf(activeTask)} avatar={avatarOf(activeTask.assignee)} blocked={blockedIds.has(activeTask.id)} lifted />}
        </DragOverlay>
      </DndContext>

      {modal?.kind === 'create' && (
        <Modal labelledBy="new-task" onClose={close} size="lg">
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
        <Modal labelledBy={`task-title-${modalTask.id}`} onClose={close} size="lg">
          <TaskDetails
            task={modalTask}
            taskLabel={labelOf(modalTask)}
            projectCode={projectCode}
            members={members}
            handingOff={handingOff}
            onHandOff={(assignee) => handOff(modalTask, assignee)}
            allTasks={tasks}
            onOpenTask={(id) => setModal({ kind: 'view', id })}
            blockerControls={blockerHandlers(modalTask)}
            onEdit={() => setModal({ kind: 'edit', id: modalTask.id, from: 'view' })}
            onClose={close}
            focusOutcomeId={modalTask.id === openTaskId ? focusOutcome : undefined}
          />
        </Modal>
      )}
      {modal?.kind === 'edit' && modalTask && (
        <Modal labelledBy={`edit-task-${modalTask.id}`} onClose={close} size="lg">
          <TaskForm
            {...formProps}
            task={modalTask}
            onDone={close}
            onCancel={() => setModal(modal.from === 'pick' ? { kind: 'pick' } : { kind: 'view', id: modalTask.id })}
          />
        </Modal>
      )}

      {modal?.kind === 'clear' && (
        <Modal labelledBy="clear-board" onClose={close}>
          <ClearBoardDialog projectName={project.name} projectCode={projectCode} count={tasks.length} busy={clearing} onConfirm={clearBoard} onCancel={close} />
        </Modal>
      )}

      <TotalContext project={project} tasks={tasks} labels={labels} />
      <Toast toast={toast} onDone={clearToast} />
    </>
  );
}

function Column({
  id,
  label,
  tasks,
  labelOf,
  avatarOf,
  blockedIds,
  settledId,
  glowId,
  remoteIds,
  projectCode,
  onOpen,
  onAdd,
}: {
  id: Status;
  label: string;
  tasks: BoardTask[];
  labelOf: (task: BoardTask) => Label | undefined;
  avatarOf: (name: string) => string | null;
  blockedIds: Set<string>;
  settledId: string | null;
  glowId: string | null;
  remoteIds: Set<string>; // changed elsewhere since the last refresh
  projectCode: string;
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  // Column = soft tray. Header: stage dot · name · count · "+" (add to this column).
  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`col-${id}`}
      className={`flex min-h-[280px] min-w-0 flex-col rounded-xl p-2 ${
        isOver
          ? 'border border-brand bg-brand-soft'
          : 'border border-line bg-sunken'
      }`}
    >
      <div className="-mx-2 -mt-2 mb-2 flex h-10 items-center gap-2 border-b border-line px-3">
        <span className={`h-2 w-2 shrink-0 rounded-full ${STAGE_BAR[id]}`} aria-hidden />
        <h2 id={`col-${id}`} className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-muted">
          {label}
        </h2>
        <span className="tabular text-[12px] text-fg-subtle">{tasks.length}</span>
        <button
          type="button"
          onClick={onAdd}
          aria-label={`Add task to ${label}`}
          title={`Add task to ${label}`}
          className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-md text-fg-subtle hover:bg-surface hover:text-fg hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            label={labelOf(task)}
            blocked={blockedIds.has(task.id)}
            settle={settledId === task.id || remoteIds.has(task.id)}
            glow={glowId === task.id || remoteIds.has(task.id)}
            avatar={avatarOf(task.assignee)}
            projectCode={projectCode}
            onOpen={() => onOpen(task.id)}
          />
        ))}
        {tasks.length === 0 && (
          <button
            type="button"
            onClick={onAdd}
            className="flex h-[84px] items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong text-[12px] text-fg-subtle hover:border-line-strong hover:text-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add task
          </button>
        )}
      </div>
    </section>
  );
}
