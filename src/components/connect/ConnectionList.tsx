'use client';

import { useState, useTransition } from 'react';
import { revokeConnectionAction } from '@/app/connect/actions';
import { btn } from '@/components/ui';

// Existing connections with their access, scope and state; active ones can be revoked.

export interface ConnectionRow {
  id: string;
  name: string;
  hint: string;
  canWrite: boolean;
  scope: string; // "Demo Board (#DEMO)" or "All my projects"
  expires: string;
  lastUsed: string;
  state: 'active' | 'expired' | 'revoked';
}

const STATE_STYLE = {
  active: 'bg-stage-done/15 text-fg',
  expired: 'bg-muted text-fg-subtle',
  revoked: 'bg-muted text-fg-subtle',
};

export default function ConnectionList({ connections }: { connections: ConnectionRow[] }) {
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function revoke(row: ConnectionRow) {
    if (!confirm(`Revoke "${row.name}"? Any AI using it loses access immediately.`)) return;
    setBusyId(row.id);
    startTransition(async () => {
      const result = await revokeConnectionAction(row.id);
      setError(result.ok ? null : result.error);
      setBusyId(null);
    });
  }

  if (connections.length === 0) {
    return <p className="border border-dashed border-line-strong px-3 py-6 text-center text-[13px] text-fg-subtle">No connections yet.</p>;
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-2 text-[13px] text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
      <ul className="divide-y divide-line rounded-md border border-line bg-surface">
        {connections.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2.5 text-[13px]">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-fg">{row.name}</span>
                <code className="font-mono text-[11px] text-fg-subtle">{row.hint}…</code>
                <span className={`rounded px-1.5 py-px text-[11px] font-medium capitalize ${STATE_STYLE[row.state]}`}>{row.state}</span>
              </p>
              <p className="mt-0.5 text-[12px] text-fg-subtle">
                {row.canWrite ? 'Can move tasks' : 'Read only'} · {row.scope} · {row.expires} · {row.lastUsed}
              </p>
            </div>
            {row.state === 'active' && (
              <button type="button" className={btn.danger} onClick={() => revoke(row)} disabled={pending && busyId === row.id}>
                {busyId === row.id ? 'Revoking…' : 'Revoke'}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
