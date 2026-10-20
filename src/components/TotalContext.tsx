'use client';

import { FileStack } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatBoardContext } from '@/lib/board-context';
import { hasContext } from '@/lib/context';
import { averageHealth } from '@/lib/health';
import type { BoardTask, Label, Project } from '@/lib/types';
import CopyButton from './CopyButton';
import HealthMeter from './HealthMeter';
import Modal, { ModalHeader, btn } from './Modal';

export type BoardProjectInfo = Pick<Project, 'name' | 'code' | 'client' | 'description' | 'teamName'>;

// "Total context": the whole board as one Markdown briefing, every task's context labelled.
// Opened from a vertical tab pinned to the right edge of the board.
export default function TotalContext({ project, tasks, labels }: { project: BoardProjectInfo; tasks: BoardTask[]; labels: Label[] }) {
  const [open, setOpen] = useState(false);
  const [includePrompts, setIncludePrompts] = useState(true);

  const markdown = useMemo(
    () => (open ? formatBoardContext(project, tasks, labels, { includePrompts }) : ''),
    [open, project, tasks, labels, includePrompts],
  );
  const withContext = tasks.filter((t) => hasContext(t.context)).length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="fixed right-0 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-2 border border-r-0 border-brand bg-brand px-2 py-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-brand-fg shadow-lift hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        <FileStack className="h-4 w-4" aria-hidden />
        <span className="[writing-mode:vertical-rl]">Total context</span>
      </button>

      {open && (
        <Modal labelledBy="total-context-title" onClose={() => setOpen(false)} size="lg">
          <ModalHeader
            id="total-context-title"
            eyebrow={<span className="font-mono text-fg-subtle">#{project.code}</span>}
            title="Total context"
            onClose={() => setOpen(false)}
          />

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line px-5 py-3 text-[13px] text-fg-muted">
            <span>
              <strong className="tabular text-fg">{tasks.length}</strong> tasks
            </span>
            <span>
              <strong className="tabular text-fg">{withContext}</strong> with context
            </span>
            <HealthMeter score={averageHealth(tasks)} />
            <label className="ml-auto flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={includePrompts}
                onChange={(e) => setIncludePrompts(e.target.checked)}
                className="h-3.5 w-3.5 accent-brand"
              />
              Include prompt history
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <p className="mb-3 text-[13px] text-fg-subtle">
              Every task on this board, grouped by stage, each with its own labelled context. Paste it into Claude, ChatGPT or
              Cursor to brief an AI on the whole project at once.
            </p>
            <pre
              tabIndex={0}
              aria-label="Total context preview"
              className="whitespace-pre-wrap border border-line bg-muted p-4 font-mono text-[12px] leading-5 text-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {markdown}
            </pre>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4">
            <span className="tabular text-[12px] text-fg-subtle">
              {markdown.length.toLocaleString()} characters · ~{Math.ceil(markdown.length / 4).toLocaleString()} tokens
            </span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setOpen(false)} className={btn.secondary}>
                Close
              </button>
              <CopyButton
                getText={() => markdown}
                label="Copy total context"
                className="!h-8 !border-brand !bg-brand !px-3 !text-[13px] !text-brand-fg hover:!bg-brand-hover"
              />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
