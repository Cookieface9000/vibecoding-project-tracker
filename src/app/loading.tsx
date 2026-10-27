// Shown instantly in the main area while a page's data loads (the sidebar stays put).
// Next.js can also prefetch up to this point, so clicking a link responds straight away.
export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="flex flex-1 flex-col">
      <div className="flex h-14 shrink-0 items-center border-b border-line bg-surface px-6">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
      </div>
      <div className="mx-auto w-full max-w-6xl space-y-4 px-6 py-6">
        <div className="h-5 w-56 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg border border-line bg-surface" />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
