import { initials } from '@/components/task-style';
import type { BoardTask, TaskEvent } from '@/lib/types';

// Who handed work to whom. People sit on a circle; arrow weight = number of handoffs.
export default function HandoffMap({ events, tasks }: { events: TaskEvent[]; tasks: BoardTask[] }) {
  const handoffs = events.filter((e) => e.kind === 'handoff' && e.from && e.to && e.from !== e.to);
  const edges = new Map<string, { from: string; to: string; count: number }>();
  for (const e of handoffs) {
    const k = `${e.from}→${e.to}`;
    edges.set(k, { from: e.from!, to: e.to!, count: (edges.get(k)?.count ?? 0) + 1 });
  }

  const people = [...new Set([...handoffs.flatMap((e) => [e.from!, e.to!]), ...tasks.map((t) => t.assignee)])];
  const openBy = new Map(people.map((p) => [p, tasks.filter((t) => t.assignee === p && t.status !== 'done').length]));

  if (edges.size === 0) {
    return <p className="border border-dashed border-line-strong px-3 py-8 text-center text-[13px] text-fg-subtle">No handoffs yet. Use “Hand off to…” in a task.</p>;
  }

  const W = 420;
  const H = 300;
  const cx = W / 2;
  const cy = H / 2;
  const R = 110;
  const pos = new Map(
    people.map((p, i) => {
      const a = (i / people.length) * Math.PI * 2 - Math.PI / 2;
      return [p, { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }];
    }),
  );
  const maxCount = Math.max(...[...edges.values()].map((e) => e.count));
  const nodeR = 18;

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-md" role="img" aria-label={`Handoff map: ${handoffs.length} handoffs between ${people.length} people.`}>
        <defs>
          <marker id="handoff-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" className="fill-brand" />
          </marker>
        </defs>
        {[...edges.values()].map((e) => {
          const a = pos.get(e.from)!;
          const b = pos.get(e.to)!;
          // Curve each direction to its own side so A→B and B→A don't overlap.
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          const bend = 22;
          const qx = mx - (dy / len) * bend;
          const qy = my + (dx / len) * bend;
          // Shorten to the node edges.
          const sx = a.x + ((qx - a.x) / Math.hypot(qx - a.x, qy - a.y)) * nodeR;
          const sy = a.y + ((qy - a.y) / Math.hypot(qx - a.x, qy - a.y)) * nodeR;
          const ex = b.x - ((b.x - qx) / Math.hypot(b.x - qx, b.y - qy)) * (nodeR + 2);
          const ey = b.y - ((b.y - qy) / Math.hypot(b.x - qx, b.y - qy)) * (nodeR + 2);
          return (
            <g key={`${e.from}-${e.to}`}>
              <path
                d={`M${sx},${sy} Q${qx},${qy} ${ex},${ey}`}
                fill="none"
                className="stroke-brand"
                strokeOpacity={0.35 + 0.65 * (e.count / maxCount)}
                strokeWidth={1.5 + 2.5 * (e.count / maxCount)}
                markerEnd="url(#handoff-arrow)"
              >
                <title>{`${e.from} → ${e.to}: ${e.count} handoff${e.count === 1 ? '' : 's'}`}</title>
              </path>
              <text x={qx} y={qy} textAnchor="middle" dominantBaseline="middle" className="fill-fg text-[10px] font-semibold tabular">
                {e.count}
              </text>
            </g>
          );
        })}
        {people.map((p) => {
          const { x, y } = pos.get(p)!;
          const below = y > cy;
          return (
            <g key={p}>
              <circle cx={x} cy={y} r={nodeR} className="fill-surface stroke-line-strong" strokeWidth={1.5} />
              <text x={x} y={y} textAnchor="middle" dominantBaseline="central" className="fill-fg text-[11px] font-semibold">
                {initials(p)}
              </text>
              <text x={x} y={below ? y + nodeR + 13 : y - nodeR - 7} textAnchor="middle" className="fill-fg-muted text-[11px]">
                {p}
                <tspan className="fill-fg-subtle"> · {openBy.get(p)} open</tspan>
              </text>
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>Handoffs</caption>
        <tbody>
          {[...edges.values()].map((e) => (
            <tr key={`${e.from}-${e.to}`}>
              <th scope="row">{`${e.from} to ${e.to}`}</th>
              <td>{e.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
