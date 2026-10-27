'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Sidebar links that highlight themselves from the current URL. The sidebar lives in the root
// layout, which stays mounted between pages, so each link works out on its own whether it's active.

export const navItem =
  'flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';
const navIdle = 'text-sidebar-fg-muted hover:bg-sidebar-hover hover:text-sidebar-fg';
const navActive = 'bg-sidebar-active text-sidebar-fg shadow-[inset_2px_0_0_rgb(var(--brand))]';

/** Active on `href` itself, or (with `nested`) on any page below it. */
function useActive(href: string, nested: boolean) {
  const pathname = usePathname();
  return pathname === href || (nested && pathname.startsWith(`${href}/`));
}

export function NavLink({ href, nested = false, className = '', children }: { href: string; nested?: boolean; className?: string; children: React.ReactNode }) {
  const active = useActive(href, nested);
  return (
    <Link href={href} aria-current={active ? 'page' : undefined} className={`${navItem} ${active ? navActive : navIdle} ${className}`}>
      {children}
    </Link>
  );
}

/**
 * A project in the sidebar: code badge + name. Also active on the project's Insights page.
 * `mcp` marks the Demo Board, the board set up for trying the AI (MCP) connection.
 */
export function ProjectLink({ id, code, name, title, mcp = false }: { id: string; code: string; name: string; title: string; mcp?: boolean }) {
  const href = `/projects/${id}`;
  const active = useActive(href, true);
  return (
    <Link href={href} aria-current={active ? 'page' : undefined} title={title} className={`${navItem} ${active ? navActive : navIdle}`}>
      <span
        className={`flex h-5 min-w-[1.25rem] items-center justify-center rounded px-1 font-mono text-[10px] font-semibold ${
          active ? 'bg-brand text-brand-fg' : 'bg-sidebar-active text-sidebar-fg-muted'
        }`}
        aria-hidden
      >
        {code.slice(0, 2)}
      </span>
      <span className="truncate">{name}</span>
      {mcp && (
        <span
          className="ml-auto shrink-0 rounded border border-brand/50 px-1 font-mono text-[9px] font-semibold leading-4 tracking-[0.04em] text-brand"
          title="Try the AI (MCP) connection on this board"
        >
          MCP
        </span>
      )}
    </Link>
  );
}
