'use client';

import { CalendarDays, CheckCircle2, Circle, Gauge, GitBranch, History, MessageSquareText, Pencil, Tag, User } from 'lucide-react';
import { HEALTH_LABEL, contextHealth, healthBand } from '@/lib/health';
import { isBlocked } from '@/lib/blocking';
import BlockerManager, { type BlockerControls } from './BlockerManager';
import HealthMeter from './HealthMeter';
import { formatBriefing, hasContext } from '@/lib/context';
import { dueLabel, dueState } from '@/lib/due';
import { STAGES, type BoardTask, type Label, type Member } from '@/lib/types';
import CopyButton from './CopyButton';
import { ModalHeader, btn } from './Modal';
import { DUE_STYLE, LABEL_STYLE, STAGE_DOT, TYPE_STYLE, initials } from './task-style';

const dateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return dateFmt.format(new Date(y, m - 1, d));
}

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

// Ticket view shown when a card is clicked. Everything is read-only except
// "Hand off to…", which reassigns in one step.
export default function TaskDetails({
  task,
  taskLabel,
  projectCode,
  members,
  allTasks,
  onOpenTask,
  blockerControls,
  handingOff = false,
  onHandOff,
  onEdit,
  onClose,
}: {
  task: BoardTask;
  taskLabel?: Label;
  projectCode: string;
  members: Member[];
  allTasks: BoardTask[];
  onOpenTask: (id: string) => void;
  blockerControls: BlockerControls;
  handingOff?: boolean;
  onHandOff: (assignee: string) => void;
  onEdit: () => void;
  onClose: () => void;
}) {
  const type = TYPE_STYLE[task.type];
  const state = dueState(task);
  const due = DUE_STYLE[state];
  const label = dueLabel(task);
  const stage = STAGES.find((s) => s.id === task.status);
  const health = contextHealth(task);
  const byId = new Map(allTasks.map((t) => [t.id, t]));
  const blockers = task.blockers.filter((b) => byId.has(b.taskId));
  const blocked = isBlocked(task, byId);

  return (
    <>
      <ModalHeader
        id={`task-title-${task.id}`}
        eyebrow={
          <>
            <span className="font-mono text-fg-subtle">#{projectCode}</span>
            <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-medium uppercase tracking-wide ${type.chip}`}>
              <type.Icon className="h-3 w-3" aria-hidden />
              {type.label}
            </span>
          </>
        }
        title={task.title}
        onClose={onClose}
      />

      <div className="space-y-6 overflow-y-auto px-6 py-5">
        {/* Key facts: fixed 3×2 grid so every modal lines up the same way */}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
          <Fact label="Status">
            <span className="inline-flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${STAGE_DOT[task.status]}`} aria-hidden />
              {stage?.label}
            </span>
          </Fact>
          <Fact label="Assignee" icon={User}>
            <span className="inline-flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-avatar text-[10px] font-semibold text-fg-muted">
                {initials(task.assignee)}
              </span>
              {task.assignee}
            </span>
            <label htmlFor={`handoff-${task.id}`} className="sr-only">
              Hand off to
            </label>
            <select
              id={`handoff-${task.id}`}
              value=""
              disabled={handingOff}
              onChange={(e) => e.target.value && onHandOff(e.target.value)}
              className="mt-2 block w-full rounded-md border border-line-strong bg-surface px-2 py-1 text-xs text-fg-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-60"
            >
              <option value="">{handingOff ? 'Handing off…' : 'Hand off to…'}</option>
              {members
                .filter((m) => m.name !== task.assignee)
                .map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
            </select>
          </Fact>
          <Fact label="Due date" icon={CalendarDays}>
            {task.dueDate ? (
              <span className="inline-flex flex-wrap items-center gap-2">
                {formatDate(task.dueDate)}
                {task.dueTime && <span className="text-fg-subtle">{task.dueTime}</span>}
                {label && (
                  <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${due.chip}`}>
                    <due.Icon className="h-3 w-3" aria-hidden />
                    {label}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-fg-subtle">No due date</span>
            )}
          </Fact>
          <Fact label="Label" icon={Tag}>
            {taskLabel ? (
              <span className={"inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs font-medium " + LABEL_STYLE[taskLabel.color].chip}>
                <span className={"h-2 w-2 rounded-full " + LABEL_STYLE[taskLabel.color].dot} aria-hidden />
                {taskLabel.name}
              </span>
            ) : (
              <span className="text-fg-subtle">No label</span>
            )}
          </Fact>
          <Fact label="Created" icon={CalendarDays}>
            {formatDate(task.createdDate)}
          </Fact>
          <Fact label="AI tool" icon={MessageSquareText}>
            {task.contextTool ?? <span className="text-fg-subtle">None</span>}
          </Fact>
        </dl>

        {/* Context health: what makes this task ready to hand to someone (or an AI) else. */}
        <Section title="Context health" icon={Gauge} aside={`${health.score}/100 · ${HEALTH_LABEL[healthBand(health.score)]}`}>
          <div className="mb-3"><HealthMeter score={health.score} label={false} /></div>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-3">
            {health.checks.map((c) => (
              <li key={c.id} className={`flex items-center gap-1.5 ${c.met ? 'text-fg' : 'text-fg-subtle'}`}>
                {c.met ? <CheckCircle2 className="h-3.5 w-3.5 text-brand-ink" aria-hidden /> : <Circle className="h-3.5 w-3.5" aria-hidden />}
                {c.label}
                <span className="sr-only">{c.met ? '(done)' : '(missing)'}</span>
                <span className="ml-auto tabular text-[11px] text-fg-subtle">+{c.points}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          title="Blockers"
          icon={GitBranch}
          aside={blocked ? 'Blocked' : blockers.length ? 'Not blocked' : 'None'}
        >
          <BlockerManager task={task} allTasks={allTasks} onOpenTask={onOpenTask} controls={blockerControls} />
        </Section>

        {task.description && (
          <Section title="Description">
            <p className="text-sm leading-6 text-fg-muted">{task.description}</p>
          </Section>
        )}

        <Section
          title="Context"
          icon={MessageSquareText}
          aside={
            task.contextUpdatedAt
              ? `${task.contextTool ? `${task.contextTool} · ` : ''}updated ${timeAgo(task.contextUpdatedAt)}`
              : undefined
          }
        >
          {hasContext(task.context) ? (
            <>
            <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted p-3 font-mono text-xs leading-5 text-fg-muted">
              {task.context}
            </pre>
            <div className="mt-2 flex justify-end">
              <CopyButton getText={() => formatBriefing(task, projectCode)} />
            </div>
            </>
          ) : (
            <Empty>No context yet. Use Edit to add a briefing.</Empty>
          )}
        </Section>

        <Section title="Prompt history" icon={History} aside={task.prompts.length ? `${task.prompts.length} prompts` : undefined}>
          {task.prompts.length === 0 ? (
            <Empty>No prompts logged for this task yet.</Empty>
          ) : (
            <ol className="relative space-y-3 border-l border-line pl-5">
              {task.prompts.map((p) => (
                <li key={p.id} className="relative">
                  <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-raised bg-brand" aria-hidden />
                  <div className="flex items-center gap-2 text-xs text-fg-subtle">
                    {p.tool && (
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-fg-muted">
                        {p.tool}
                      </span>
                    )}
                    <time dateTime={p.createdAt} title={dateTimeFmt.format(new Date(p.createdAt))}>
                      {timeAgo(p.createdAt)}
                    </time>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap rounded-lg border border-line bg-surface p-2.5 font-mono text-xs leading-5 text-fg-muted">
                    {p.prompt}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Section>
      </div>

      <div className="flex justify-end gap-3 border-t border-line px-6 py-4">
        <button type="button" onClick={onClose} className={btn.secondary}>
          Close
        </button>
        <button type="button" onClick={onEdit} className={btn.primary}>
          <Pencil className="h-4 w-4" aria-hidden />
          Edit
        </button>
      </div>
    </>
  );
}

function Fact({ label, icon: Icon, children }: { label: string; icon?: typeof User; children: React.ReactNode }) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-fg-subtle">
        {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
        {label}
      </dt>
      <dd className="mt-1 text-fg">{children}</dd>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  aside,
  children,
}: {
  title: string;
  icon?: typeof User;
  aside?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
          {title}
        </h3>
        {aside && <span className="text-xs text-fg-subtle">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-line-strong px-3 py-4 text-center text-xs text-fg-subtle">
      {children}
    </p>
  );
}
