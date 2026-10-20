import { CONTEXT_TOOLS, type BoardTask, type ContextTool } from '@/lib/types';

// Prompts per day over the last 14 days, stacked by AI tool. Pure SVG.
export const TOOL_COLOR: Record<ContextTool | 'Unknown', string> = {
  Claude: '#D97757',
  ChatGPT: '#10A37F',
  Cursor: '#3B82F6',
  Lovable: '#E5487A',
  Replit: '#8B5CF6',
  Other: '#64748B',
  Unknown: '#94A3B8',
};

const DAYS = 14;

export default function PromptTimeline({ tasks }: { tasks: BoardTask[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (DAYS - 1 - i));
    return d;
  });
  const key = (d: Date) => d.toISOString().slice(0, 10);
  const counts = new Map(days.map((d) => [key(d), new Map<string, number>()]));

  for (const t of tasks) {
    for (const p of t.prompts) {
      const k = key(new Date(new Date(p.createdAt).setHours(0, 0, 0, 0)));
      const day = counts.get(k);
      if (!day) continue;
      const tool = p.tool ?? 'Unknown';
      day.set(tool, (day.get(tool) ?? 0) + 1);
    }
  }

  const totals = days.map((d) => [...counts.get(key(d))!.values()].reduce((a, b) => a + b, 0));
  const max = Math.max(1, ...totals);
  const total = totals.reduce((a, b) => a + b, 0);
  const toolsUsed = [...CONTEXT_TOOLS, 'Unknown' as const].filter((tool) => days.some((d) => counts.get(key(d))!.get(tool)));

  const W = 640;
  const H = 180;
  const pad = { l: 28, r: 8, t: 8, b: 26 };
  const bw = (W - pad.l - pad.r) / DAYS;
  const y = (v: number) => H - pad.b - (v / max) * (H - pad.t - pad.b);
  const fmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });

  if (total === 0) {
    return <p className="border border-dashed border-line-strong px-3 py-8 text-center text-[13px] text-fg-subtle">No prompts logged in the last 14 days.</p>;
  }

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Prompts per day for the last ${DAYS} days: ${total} in total.`}>
        {/* y gridlines */}
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={pad.l} x2={W - pad.r} y1={y(max * f)} y2={y(max * f)} className="stroke-line" strokeWidth={1} />
            <text x={pad.l - 6} y={y(max * f) + 3} textAnchor="end" className="fill-fg-subtle text-[10px] tabular">
              {Math.round(max * f)}
            </text>
          </g>
        ))}
        {days.map((d, i) => {
          const day = counts.get(key(d))!;
          let acc = 0;
          return (
            <g key={key(d)}>
              {toolsUsed.map((tool) => {
                const n = day.get(tool) ?? 0;
                if (!n) return null;
                const y0 = y(acc);
                acc += n;
                const y1 = y(acc);
                return (
                  <rect key={tool} x={pad.l + i * bw + bw * 0.18} width={bw * 0.64} y={y1} height={Math.max(y0 - y1, 1)} fill={TOOL_COLOR[tool]}>
                    <title>{`${fmt.format(d)} · ${tool}: ${n}`}</title>
                  </rect>
                );
              })}
              {(i % 2 === 1 || i === DAYS - 1) && (
                <text x={pad.l + i * bw + bw / 2} y={H - 8} textAnchor="middle" className="fill-fg-subtle text-[10px]">
                  {i === DAYS - 1 ? 'Today' : fmt.format(d)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-fg-muted">
        {toolsUsed.map((tool) => (
          <span key={tool} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5" style={{ backgroundColor: TOOL_COLOR[tool] }} aria-hidden />
            {tool}
          </span>
        ))}
        <span className="ml-auto tabular text-fg-subtle">{total} prompts</span>
      </figcaption>
      <table className="sr-only">
        <caption>Prompts per day</caption>
        <tbody>
          {days.map((d, i) => (
            <tr key={key(d)}>
              <th scope="row">{fmt.format(d)}</th>
              <td>{totals[i]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
