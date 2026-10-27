import { avatarDrawing } from '@/lib/avatar';

// A member's generated picture (see lib/avatar.ts). Pure SVG, so it works in server and
// client components alike. Decorative by default: pass `label` when nothing else names the person.
export default function Avatar({
  name,
  avatar,
  size = 20,
  label,
  className = '',
}: {
  name: string;
  avatar: string | null | undefined;
  size?: number;
  label?: string;
  className?: string;
}) {
  const d = avatarDrawing(name, avatar);
  const bg = `hsl(${d.hue} 55% 38%)`;
  const a11y = label ? { role: 'img' as const, 'aria-label': label } : { 'aria-hidden': true };

  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={`shrink-0 rounded-full ${className}`} {...a11y}>
      {d.kind === 'pattern' ? (
        <>
          <rect width="40" height="40" fill={`hsl(${d.hue} 45% 90%)`} />
          {d.cells.map((on, i) =>
            on ? <rect key={i} x={5 + (i % 5) * 6} y={5 + Math.floor(i / 5) * 6} width="6" height="6" fill={bg} /> : null,
          )}
        </>
      ) : (
        <>
          <rect width="40" height="40" fill={bg} />
          <text
            x="20"
            y="21"
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontFamily="var(--font-body), system-ui, sans-serif"
            fontWeight="700"
            fontSize={d.kind === 'letter' ? 22 : 15}
          >
            {d.text}
          </text>
        </>
      )}
    </svg>
  );
}
