'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

// A section with a ▾ toggle to hide/show its contents. Open/closed is remembered per browser.
export default function Collapsible({
  storageKey,
  title,
  meta,
  defaultOpen = true,
  variant = 'page',
  children,
}: {
  storageKey: string;
  title: React.ReactNode;
  meta?: React.ReactNode;
  defaultOpen?: boolean;
  variant?: 'page' | 'sidebar' | 'sidebar-sub';
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();
  const key = `vibetracker.collapse.${storageKey}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) setOpen(saved === '1');
    } catch {
      /* storage blocked — use the default */
    }
  }, [key]);

  function toggle() {
    setOpen((o) => {
      try {
        localStorage.setItem(key, o ? '0' : '1');
      } catch {
        /* storage blocked — still toggles for this visit */
      }
      return !o;
    });
  }

  const styles = {
    page: {
      button: 'flex w-full items-center gap-2 border-b border-line pb-2 text-left text-fg hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
      title: 'text-[15px] font-semibold',
      chevron: 'h-4 w-4 text-fg-subtle',
      body: 'pt-3',
    },
    sidebar: {
      button: 'flex w-full items-center gap-1.5 px-2 py-1 text-left text-sidebar-fg hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
      title: 'text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-fg-muted',
      chevron: 'h-3.5 w-3.5 text-sidebar-fg-muted',
      body: 'pb-2',
    },
    'sidebar-sub': {
      button: 'flex w-full items-center gap-1.5 px-2 py-1 text-left text-sidebar-fg hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
      title: 'text-[12px] font-semibold',
      chevron: 'h-3.5 w-3.5 text-sidebar-fg-muted',
      body: 'pb-1 pl-2',
    },
  }[variant];

  return (
    <div>
      <button type="button" onClick={toggle} aria-expanded={open} aria-controls={contentId} className={styles.button}>
        <ChevronDown
          className={`${styles.chevron} shrink-0 transition-transform duration-150 ${open ? '' : '-rotate-90'}`}
          aria-hidden
        />
        <span className={`min-w-0 flex-1 truncate ${styles.title}`}>{title}</span>
        {meta && <span className="shrink-0">{meta}</span>}
      </button>
      <div id={contentId} hidden={!open} className={styles.body}>
        {children}
      </div>
    </div>
  );
}
