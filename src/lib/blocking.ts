import type { BoardTask, Status } from './types';

// One rule for "blocked", used by cards, the modal, Insights and Total context:
// a task is blocked while any ACTIVE blocker isn't done. Inactive links are kept for
// reference but never block.

type StatusLookup = Map<string, Pick<BoardTask, 'status'>> | Map<string, { status: Status }>;

/** Is this one link blocking right now? */
export function isLinkBlocking(link: { taskId: string; active: boolean }, byId: StatusLookup) {
  const blocker = byId.get(link.taskId);
  return Boolean(blocker) && link.active && blocker!.status !== 'done';
}

export function activeBlockers(task: Pick<BoardTask, 'blockers'>, byId: StatusLookup) {
  return task.blockers.filter((b) => isLinkBlocking(b, byId));
}

export function isBlocked(task: Pick<BoardTask, 'status' | 'blockers'>, byId: StatusLookup) {
  return task.status !== 'done' && activeBlockers(task, byId).length > 0;
}
