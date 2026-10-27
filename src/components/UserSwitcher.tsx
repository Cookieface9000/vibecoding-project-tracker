'use client';

import { Check, ChevronsUpDown } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { switchUser } from '@/app/actions';
import type { Member } from '@/lib/types';
import Avatar from './Avatar';

// Bottom of the sidebar: who you're acting as, and a menu to become someone else.
// A stand-in for signing in until accounts exist (lib/current-user.ts).
export default function UserSwitcher({ current, members }: { current: Member; members: Member[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const root = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => root.current && !root.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function choose(member: Member) {
    setOpen(false);
    if (member.id === current.id) return;
    startTransition(async () => {
      const result = await switchUser(member.id);
      if (!result.ok) return setError(result.error);
      setError(null);
      // A project page may belong to a team the new user isn't in.
      if (pathname.startsWith('/projects/') && pathname !== '/projects/new') router.push('/');
      router.refresh();
    });
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={pending}
        className="flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-left text-[13px] text-sidebar-fg transition-colors hover:bg-sidebar-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <Avatar name={current.name} avatar={current.avatar} size={22} />
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] uppercase tracking-[0.08em] text-sidebar-fg-muted">{pending ? 'Switching…' : 'Acting as'}</span>
          <span className="block truncate font-medium leading-4">{current.name}</span>
        </span>
        <ChevronsUpDown className="h-4 w-4 text-sidebar-fg-muted" aria-hidden />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Switch user"
          className="absolute bottom-full left-0 right-0 z-30 mb-1 max-h-72 overflow-y-auto rounded-md border border-line bg-surface p-1 shadow-lift"
        >
          <li className="px-2 pb-1 pt-1.5 text-[11px] text-fg-subtle">Switch user (no sign-in yet)</li>
          {members.map((m) => (
            <li key={m.id} role="option" aria-selected={m.id === current.id}>
              <button
                type="button"
                onClick={() => choose(m)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] text-fg hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <Avatar name={m.name} avatar={m.avatar} size={20} />
                <span className="min-w-0 flex-1 truncate">{m.name}</span>
                {m.id === current.id && <Check className="h-4 w-4 text-brand-ink" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="px-2 pt-1 text-[12px] text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
