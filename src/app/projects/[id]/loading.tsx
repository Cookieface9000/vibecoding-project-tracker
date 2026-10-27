import { STAGES } from '@/lib/types';

// Board-shaped placeholder shown instantly while a project's tasks load.
export default function Loading() {
  return (
    <div role="status" aria-label="Loading board" className="flex flex-1 flex-col">
      <div className="flex h-14 shrink-0 items-center border-b border-line bg-surface px-6">
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-11 shrink-0 border-b border-line bg-surface" />
      <main className="flex-1 py-5 pl-6 pr-16">
        <div className="mb-5 h-16 animate-pulse rounded-lg border border-line bg-surface" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {STAGES.map((stage, col) => (
            <section key={stage.id} className="min-h-[280px] rounded-xl border border-line bg-sunken p-2">
              <div className="-mx-2 -mt-2 mb-2 flex h-10 items-center border-b border-line px-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">{stage.label}</span>
              </div>
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 - (col % 2) }, (_, i) => (
                  <div key={i} className="h-[84px] animate-pulse rounded-lg border border-line bg-surface" />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
