'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { restoreContextAction } from '@/app/connect/actions';
import { btn } from '@/components/ui';

// Every tool call from AI connections and the Try it panel, newest first. Context
// replacements can be undone here.

export interface ActivityRow {
  id: string;
  when: string;
  caller: string;
  tool: string;
  summary: string;
  ok: boolean;
  projectId: string | null;
  historyId: string | null; // set for update_context: the version it replaced
}

export default function ActivityList({ calls }: { calls: ActivityRow[] }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ id: string; text: string } | null>(null);

  function restore(row: ActivityRow) {
    startTransition(async () => {
      const result = await restoreContextAction(row.historyId!);
      setMessage({ id: row.id, text: result.ok ? 'Previous context restored.' : result.error });
    });
  }

  if (calls.length === 0) {
    return (
      <p className="border border-dashed border-line-strong px-3 py-6 text-center text-[13px] text-fg-subtle">
        Nothing yet. Tool calls from an AI, or from Try it, appear here.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line rounded-md border border-line bg-surface">
      {calls.map((row) => (
        <li key={row.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[13px]">
          {row.ok ? (
            <span className="inline-flex w-14 shrink-0 items-center gap-1 text-[12px] text-fg-subtle">
              <CheckCircle2 className="h-3.5 w-3.5 text-ink-safe" aria-hidden />
              OK
            </span>
          ) : (
            <span className="inline-flex w-14 shrink-0 items-center gap-1 text-[12px] font-medium text-ink-overdue">
              <XCircle className="h-3.5 w-3.5" aria-hidden />
              Failed
            </span>
          )}
          <span className="tabular w-24 shrink-0 text-[12px] text-fg-subtle">{row.when}</span>
          <span className="min-w-0 flex-1">
            <span className="font-medium text-fg">{row.caller}</span>{' '}
            <code className="font-mono text-[11px] text-fg-subtle">{row.tool}</code>
            <span className="block truncate text-fg-muted">{row.summary}</span>
            {message?.id === row.id && (
              <span role="status" className="block text-[12px] text-fg-subtle">
                {message.text}
              </span>
            )}
          </span>
          {row.historyId && (
            <button type="button" className={btn.secondary} onClick={() => restore(row)} disabled={pending}>
              Restore previous
            </button>
          )}
          {row.projectId && (
            <Link href={`/projects/${row.projectId}`} className={btn.ghost}>
              Board
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
