'use client';

import { useDraggable } from '@dnd-kit/core';
import { Check, Copy, Lock, MessageSquareText } from 'lucide-react';
import { useState } from 'react';
import { formatBriefing, hasContext } from '@/lib/context';
import { dueLabel, dueState } from '@/lib/due';
import { contextHealth } from '@/lib/health';
import type { BoardTask, Label } from '@/lib/types';
import { HealthEdge } from './HealthMeter';
import { DUE_STYLE, LABEL_STYLE, TYPE_STYLE, initials } from './task-style';

// Compact, fixed-height ticket: title (max 2 lines) + one meta row + a health bar on the bottom edge.
// Colour coding = whole-card tint by due urgency; type by icon; label by chip.
// Blocked = red outline + "Blocked" badge, so it reads from across the board.
export function TaskCardBody({
  task,
  label,
  blocked = false,
  lifted = false,
  settle = false,
  glow = false,
  copyCode,
}: {
  task: BoardTask;
  label?: Label;
  blocked?: boolean;
  lifted?: boolean;
  copyCode?: string; // when set, show the on-card Copy context button
  settle?: boolean; // just dropped into this column
  glow?: boolean; // just handed off
}) {
  const type = TYPE_STYLE[task.type];
  const due = DUE_STYLE[dueState(task)];
  const dueText = dueLabel(task);
  const done = task.status === 'done';
  const withContext = hasContext(task.context);
  const health = contextHealth(task).score;

  return (
    <div
      className={`relative flex h-[84px] w-full flex-col justify-between overflow-hidden rounded-lg border px-3 pb-3 pt-2.5 text-left transition-[background-color,border-color] duration-500 ${due.card} ${
        lifted ? 'shadow-lift ring-1 ring-line-strong' : 'group-hover:border-line-strong'
      } ${blocked ? '!border-due-overdue ring-1 ring-inset ring-due-overdue' : ''} ${settle ? 'motion-safe:animate-settle' : ''}`}
    >
      <span className="flex items-start justify-between gap-2">
        <span
          className={`line-clamp-2 text-[13px] font-medium leading-[18px] tracking-[-0.005em] ${done ? 'text-fg-subtle line-through decoration-slate-400/60' : 'text-fg'}`}
        >
          {task.title}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {blocked && (
            <span className="inline-flex h-5 items-center gap-1 rounded border border-due-overdue bg-due-overdue/10 px-1.5 text-[11px] font-semibold text-ink-overdue" title="Blocked: a blocker isn't done yet">
              <Lock className="h-3 w-3" aria-hidden />
              Blocked
            </span>
          )}
          {withContext && (
            <span className="inline-flex items-center text-brand-ink" title="Has AI context">
              <MessageSquareText className="h-3.5 w-3.5" aria-hidden />
            </span>
          )}
          {copyCode !== undefined && <CardCopyButton task={task} projectCode={copyCode} />}
        </span>
      </span>

      <span className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <type.Icon className={`h-3.5 w-3.5 shrink-0 ${type.icon}`} aria-label={type.label} />
          {dueText && (
            <span className={`tabular inline-flex h-5 shrink-0 items-center gap-1 rounded px-1.5 text-[11px] font-medium ${due.chip}`}>
              <due.Icon className="h-3 w-3 shrink-0" aria-hidden />
              {dueText}
            </span>
          )}
          {label && (
            <span className="inline-flex h-5 min-w-0 items-center gap-1 truncate rounded border border-line px-1.5 text-[11px] font-medium text-fg-muted">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${LABEL_STYLE[label.color].dot}`} aria-hidden />
              <span className="truncate">{label.name}</span>
            </span>
          )}
        </span>
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-avatar text-[9px] font-semibold text-fg-muted ${glow ? 'motion-safe:animate-glow' : ''}`}
          title={`Assigned to ${task.assignee}`}
        >
          {initials(task.assignee)}
        </span>
      </span>

      <HealthEdge score={health} />
    </div>
  );
}

/**
 * Copy this task's briefing straight from the board. Stops the click, pointer and key
 * events so it never opens the task or starts a drag.
 */
function CardCopyButton({ task, projectCode }: { task: BoardTask; projectCode: string }) {
  const [copied, setCopied] = useState(false);
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  async function copy(e: React.MouseEvent) {
    e.stopPropagation();
    const text = formatBriefing(task, projectCode);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={copy}
      onPointerDown={stop}
      onKeyDown={stop}
      aria-label={copied ? 'Context copied' : `Copy context for ${task.title}`}
      title={copied ? 'Copied — paste it into your AI' : 'Copy context'}
      className={`-m-1 inline-flex h-6 w-6 items-center justify-center rounded border border-transparent text-fg-subtle hover:border-line-strong hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${copied ? 'text-brand-ink' : ''}`}
    >
      {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      <span className="sr-only" aria-live="polite">{copied ? 'Copied' : ''}</span>
    </button>
  );
}

// Click / Enter opens the ticket; drag (or Space, ←/→, Space) moves it between columns.
export default function TaskCard({
  task,
  label,
  blocked,
  settle,
  glow,
  projectCode,
  onOpen,
}: {
  task: BoardTask;
  label?: Label;
  blocked?: boolean;
  settle?: boolean;
  glow?: boolean;
  projectCode: string;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, data: { status: task.status } });
  const extras = [
    blocked && 'Blocked.',
    hasContext(task.context) && 'Has AI context.',
    `Context health ${contextHealth(task).score} of 100.`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onOpen();
          return;
        }
        listeners?.onKeyDown?.(e);
      }}
      aria-label={`${task.title}. ${extras} Press Enter to open, Space to move.`}
      data-task-card
      className={`group cursor-grab touch-none rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand active:cursor-grabbing ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <TaskCardBody task={task} label={label} blocked={blocked} settle={settle} glow={glow} copyCode={projectCode} />
    </div>
  );
}
