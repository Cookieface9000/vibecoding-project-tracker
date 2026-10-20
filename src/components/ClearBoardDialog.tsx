'use client';

import { TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { btn, field } from './ui';

// "Delete all" confirmation. Irreversible, so the project code must be typed to enable it.
export default function ClearBoardDialog({
  projectName,
  projectCode,
  count,
  busy,
  onConfirm,
  onCancel,
}: {
  projectName: string;
  projectCode: string;
  count: number;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [typed, setTyped] = useState('');
  const matches = typed.trim().toUpperCase() === projectCode.toUpperCase();
  const tasksText = `${count} task${count === 1 ? '' : 's'}`;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (matches && !busy) onConfirm();
      }}
      className="p-6"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400" aria-hidden>
          <TriangleAlert className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 id="clear-board" className="text-[16px] font-semibold text-fg">
            Delete all tasks on this board?
          </h2>
          <p className="mt-1.5 text-[13px] text-fg-muted">
            This permanently deletes all <strong className="font-semibold text-fg">{tasksText}</strong> in {projectName}, including their context,
            prompt history, hand-off history and blockers. The project itself and its pinned links stay. This can’t be undone.
          </p>
        </div>
      </div>

      <label htmlFor="clear-board-confirm" className="mt-5 block text-[12px] font-medium text-fg-muted">
        Type <span className="font-mono font-semibold text-fg">{projectCode}</span> to confirm
      </label>
      <input
        id="clear-board-confirm"
        data-autofocus
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        className={`${field} font-mono`}
      />

      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={btn.secondary}>
          Cancel
        </button>
        <button type="submit" disabled={!matches || busy} className={btn.dangerSolid}>
          {busy ? 'Deleting…' : `Delete ${tasksText}`}
        </button>
      </div>
    </form>
  );
}
