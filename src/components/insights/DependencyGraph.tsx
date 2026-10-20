import { isBlocked, isLinkBlocking } from '@/lib/blocking';
import { STAGES, type BoardTask, type Status } from '@/lib/types';

// Tasks with dependencies, laid out in stage columns; arrows run blocker → blocked.
// Red arrows = still blocking (blocker not done).
const STAGE_FILL: Record<Status, string> = {
  todo: 'fill-stage-todo',
  'in-progress': 'fill-stage-progress',
  review: 'fill-stage-review',
  done: 'fill-stage-done',
};

export default function DependencyGraph({ tasks }: { tasks: BoardTask[] }) {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const edges = tasks.flatMap((t) =>
    t.blockers.filter((l) => byId.has(l.taskId)).map((l) => ({ from: l.taskId, to: t.id, active: l.active, live: isLinkBlocking(l, byId) })),
  );
  const involved = tasks.filter((t) => edges.some((e) => e.from === t.id || e.to === t.id));

  if (edges.length === 0) {
    return <p className="border border-dashed border-line-strong px-3 py-8 text-center text-[13px] text-fg-subtle">No dependencies yet. Add “Blocked by” when editing a task.</p>;
  }

  const W = 760;
  const colW = W / STAGES.length;
  const nodeW = colW - 28;
  const nodeH = 38;
  const gap = 14;
  const top = 30;
  const rows = Math.max(...STAGES.map((s) => involved.filter((t) => t.status === s.id).length));
  const H = top + rows * (nodeH + gap) + 10;

  const pos = new Map<string, { x: number; y: number }>();
  STAGES.forEach((s, ci) => {
    involved
      .filter((t) => t.status === s.id)
      .forEach((t, ri) => pos.set(t.id, { x: ci * colW + 14, y: top + ri * (nodeH + gap) }));
  });

  const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
  const blocking = edges.filter((e) => e.live).length;

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Dependency diagram: ${edges.length} dependencies, ${blocking} still blocking.`}>
        <defs>
          <marker id="dep-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" className="fill-fg-subtle" />
          </marker>
          <marker id="dep-arrow-blocking" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" className="fill-due-overdue" />
          </marker>
        </defs>

        {STAGES.map((s, ci) => (
          <g key={s.id}>
            {ci > 0 && <line x1={ci * colW} x2={ci * colW} y1={0} y2={H} className="stroke-line" strokeDasharray="3 4" />}
            <text x={ci * colW + 14} y={16} className="fill-fg-subtle text-[10px] font-semibold uppercase tracking-[0.06em]">
              {s.label}
            </text>
          </g>
        ))}

        {edges.map((e) => {
          const a = pos.get(e.from)!;
          const b = pos.get(e.to)!;
          const live = e.live;
          // Leave from the right edge of the blocker, enter the left edge of the blocked task
          // (or loop around when both sit in the same column).
          const sameCol = a.x === b.x;
          const sx = sameCol ? a.x + nodeW : a.x < b.x ? a.x + nodeW : a.x;
          const sy = a.y + nodeH / 2;
          const ex = sameCol ? b.x + nodeW : a.x < b.x ? b.x : b.x + nodeW;
          const ey = b.y + nodeH / 2;
          const c = sameCol ? 36 : (ex - sx) / 2;
          const d = sameCol ? `M${sx},${sy} C${sx + c},${sy} ${ex + c},${ey} ${ex + 2},${ey}` : `M${sx},${sy} C${sx + c},${sy} ${ex - c},${ey} ${ex},${ey}`;
          return (
            <path
              key={`${e.from}-${e.to}`}
              d={d}
              fill="none"
              className={live ? 'stroke-due-overdue' : 'stroke-fg-subtle'}
              strokeWidth={live ? 2 : 1.25}
              strokeDasharray={live ? undefined : e.active ? '4 3' : '1 3'}
              strokeOpacity={e.active ? 1 : 0.6}
              markerEnd={`url(#${live ? 'dep-arrow-blocking' : 'dep-arrow'})`}
            >
              <title>{`${byId.get(e.from)!.title} blocks ${byId.get(e.to)!.title}${live ? ' (still blocking)' : e.active ? ' (blocker done)' : ' (switched off)'}`}</title>
            </path>
          );
        })}

        {involved.map((t) => {
          const { x, y } = pos.get(t.id)!;
          const blocked = isBlocked(t, byId);
          return (
            <g key={t.id}>
              <rect x={x} y={y} width={nodeW} height={nodeH} className={blocked ? 'fill-surface stroke-due-overdue' : 'fill-surface stroke-line-strong'} strokeWidth={blocked ? 1.5 : 1} />
              <rect x={x} y={y} width={3} height={nodeH} className={STAGE_FILL[t.status]} />
              <text x={x + 10} y={y + 16} className="fill-fg text-[11px] font-medium">
                {truncate(t.title, 26)}
              </text>
              <text x={x + 10} y={y + 30} className="fill-fg-subtle text-[10px]">
                {blocked ? 'Blocked' : t.status === 'done' ? 'Done' : 'Unblocked'} · {t.assignee}
              </text>
              <title>{t.title}</title>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-fg-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-5 bg-due-overdue" aria-hidden />
          Still blocking
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0 w-5 border-t border-dashed border-fg-subtle" aria-hidden />
          Resolved (blocker done)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0 w-5 border-t border-dotted border-fg-subtle opacity-60" aria-hidden />
          Switched off
        </span>
        <span className="ml-auto tabular text-fg-subtle">
          {edges.length} dependencies · {blocking} blocking
        </span>
      </figcaption>
      <table className="sr-only">
        <caption>Dependencies</caption>
        <tbody>
          {edges.map((e) => (
            <tr key={`${e.from}-${e.to}`}>
              <th scope="row">{byId.get(e.to)!.title}</th>
              <td>{`blocked by ${byId.get(e.from)!.title}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
