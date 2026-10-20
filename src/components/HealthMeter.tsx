import { HEALTH_LABEL, healthBand, type HealthBand } from '@/lib/health';

// Context health 0–100. Colour follows DESIGN.md meanings (teal = good, amber = attention,
// red = problem) and is always paired with the number/label.
const FILL: Record<HealthBand, string> = {
  strong: 'bg-brand',
  partial: 'bg-due-warning',
  weak: 'bg-due-overdue',
};

/** Hairline bar along the bottom edge of a card. */
export function HealthEdge({ score }: { score: number }) {
  return (
    <span className="absolute inset-x-0 bottom-0 h-[3px] bg-line" aria-hidden>
      <span className={`block h-full ${FILL[healthBand(score)]} transition-[width] duration-500`} style={{ width: `${Math.max(score, 3)}%` }} />
    </span>
  );
}

/** Inline meter + score, e.g. in headers and project cards. */
export default function HealthMeter({ score, label = true, className = '' }: { score: number | null; label?: boolean; className?: string }) {
  if (score === null) {
    return <span className={`text-[12px] text-fg-subtle ${className}`}>Health: n/a</span>;
  }
  const band = healthBand(score);
  return (
    <span className={`inline-flex items-center gap-2 text-[12px] ${className}`} title={`Context health ${score}/100 · ${HEALTH_LABEL[band]}`}>
      {label && <span className="text-fg-subtle">Context health</span>}
      <span className="relative h-1.5 w-16 bg-line" aria-hidden>
        <span className={`absolute inset-y-0 left-0 ${FILL[band]}`} style={{ width: `${score}%` }} />
      </span>
      <span className="tabular font-semibold text-fg">{score}</span>
      <span className="sr-only">out of 100, {HEALTH_LABEL[band]}</span>
    </span>
  );
}
