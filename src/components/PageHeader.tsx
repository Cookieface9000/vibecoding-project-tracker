import ThemeToggle from '@/components/ThemeToggle';

// Shared 56 px top bar: title/breadcrumb on the left, actions + theme on the right.
export default function PageHeader({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line bg-surface px-6">
      <div className="flex min-w-0 items-center gap-2">{children}</div>
      <div className="flex shrink-0 items-center gap-2">
        {actions}
        <ThemeToggle />
      </div>
    </header>
  );
}
