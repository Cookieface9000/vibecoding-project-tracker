'use client';

import { RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { resetDemoAction } from '@/app/connect/actions';
import { btn } from '@/components/ui';

// The Demo Board: open it, or put it back to its starting state.

export default function DemoBoardCard({ projectId }: { projectId: string | null }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function reset() {
    if (projectId && !confirm('Reset the Demo Board? Every change made to it (by you or an AI) is undone.')) return;
    startTransition(async () => {
      const result = await resetDemoAction();
      setMessage(result.ok ? (projectId ? 'Demo Board reset.' : 'Demo Board created.') : result.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {projectId && (
        <Link href={`/projects/${projectId}`} className={btn.secondary}>
          Open the Demo Board
        </Link>
      )}
      <button type="button" className={projectId ? btn.ghost : btn.primary} onClick={reset} disabled={pending}>
        <RotateCcw className="h-4 w-4" aria-hidden />
        {pending ? 'Working…' : projectId ? 'Reset Demo Board' : 'Create the Demo Board'}
      </button>
      {message && (
        <span role="status" className="text-[13px] text-fg-subtle">
          {message}
        </span>
      )}
    </div>
  );
}
