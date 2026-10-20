import {
  ArrowRightLeft,
  Copy,
  FolderPlus,
  GripVertical,
  History,
  Link2,
  MessageSquareText,
  MousePointerClick,
  Pencil,
  Plus,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import ShortcutList from '@/components/guide/ShortcutList';
import PageHeader from '@/components/PageHeader';
import { TaskCardBody } from '@/components/TaskCard';
import { btn } from '@/components/ui';
import type { BoardTask, Label } from '@/lib/types';

export const metadata = { title: 'Guide · Vibe Tracker' };

// Render per request: example due dates are relative to today, and the sidebar lists live projects.
export const dynamic = 'force-dynamic';

const SECTIONS = [
  { id: 'quick-start', title: 'Quick start' },
  { id: 'projects', title: 'Projects and links' },
  { id: 'board', title: 'Reading the board' },
  { id: 'tasks', title: 'Working with tasks' },
  { id: 'context', title: 'AI context and prompts' },
  { id: 'settings', title: 'Settings and accessibility' },
  { id: 'shortcuts', title: 'Keyboard shortcuts' },
];

// Sample tickets for the board legend, dated relative to today so every urgency state shows.
function isoDaysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const SAMPLE_LABEL: Label = { id: 'sample', name: 'Backend', color: 'violet' };

function sample(overrides: Partial<BoardTask>): BoardTask {
  return {
    id: 'sample',
    projectId: 'sample',
    title: 'Example task',
    description: '',
    type: 'feature',
    status: 'todo',
    assignee: 'Me',
    labelId: SAMPLE_LABEL.id,
    dueDate: null,
    dueTime: null,
    createdDate: isoDaysFromNow(0),
    context: '',
    contextTool: null,
    contextUpdatedAt: null,
    prompts: [],
    dependsOn: [],
    blockers: [],
    ...overrides,
  };
}

export default function GuidePage() {
  const states: { task: BoardTask; title: string; text: string }[] = [
    {
      task: sample({ title: 'Add rate limiting to /login', dueDate: isoDaysFromNow(4) }),
      title: 'On track',
      text: 'Due in more than 24 hours.',
    },
    {
      task: sample({ title: 'Migrate settings to the new API', dueDate: isoDaysFromNow(0), dueTime: '17:00', status: 'in-progress', context: '## Context\nBackground…' }),
      title: 'Due soon',
      text: 'Due within 24 hours. The speech-bubble icon means it has AI context.',
    },
    {
      task: sample({ title: 'Checkout total rounds incorrectly', type: 'bug', dueDate: isoDaysFromNow(-1), status: 'review' }),
      title: 'Overdue',
      text: 'Past its due date. The bug icon marks defects.',
    },
    {
      task: sample({ title: 'Set up CI pipeline', dueDate: isoDaysFromNow(-2), status: 'done' }),
      title: 'Done',
      text: 'Finished work turns grey, whatever its date.',
    },
  ];

  return (
    <AppShell guideActive>
      <PageHeader>
        <h1 className="text-[14px] font-semibold text-fg">Guide</h1>
        <span className="text-[13px] text-fg-subtle">How to use Vibe Tracker</span>
      </PageHeader>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-10 px-6 py-8">
        {/* Table of contents */}
        <nav aria-label="On this page" className="sticky top-20 hidden h-fit w-52 shrink-0 lg:block">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">On this page</p>
          <ol className="space-y-px border-l border-line">
            {SECTIONS.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="-ml-px flex gap-2 border-l border-transparent py-1.5 pl-3 text-[13px] text-fg-muted hover:border-fg hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <span className="tabular text-fg-subtle">{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="min-w-0 max-w-3xl flex-1 space-y-12 text-[14px] leading-6 text-fg-muted">
          <header>
            <h2 className="text-[24px] font-semibold tracking-[-0.02em] text-fg">Vibe Tracker, in five minutes</h2>
            <p className="mt-2 max-w-2xl">
              A Kanban board for AI-assisted engineering. Each task keeps the context and prompts that produced it, so you,
              a teammate, or another AI tool can pick the work up without starting from scratch.
            </p>
          </header>

          <Section id="quick-start" n={1} title="Quick start">
            <ol className="grid gap-px border border-line bg-line sm:grid-cols-3">
              <Step icon={FolderPlus} n={1} title="Create a project">
                Use <strong className="text-fg">New project</strong> in the sidebar. Give it a name; a short code like{' '}
                <Code>#CP</Code> is suggested for you.
              </Step>
              <Step icon={Plus} n={2} title="Add tasks">
                Press <strong className="text-fg">New task</strong>, or the <strong className="text-fg">+</strong> on any
                column. Set type, owner, label and due date.
              </Step>
              <Step icon={GripVertical} n={3} title="Move work along">
                Drag tasks from To Do → In Progress → Review → Done as the work moves.
              </Step>
            </ol>
            <div className="flex flex-wrap gap-2">
              <Link href="/projects/new" className={btn.primary}>
                <FolderPlus className="h-4 w-4" aria-hidden />
                Create a project
              </Link>
              <Link href="/" className={btn.secondary}>
                Go to all projects
              </Link>
            </div>
          </Section>

          <Section id="projects" n={2} title="Projects and links">
            <p>
              <strong className="text-fg">All projects</strong> lists every project with its status, progress across the four
              stages, and how many tasks are overdue. Click a project to open its board.
            </p>
            <Feature icon={Link2} title="Project links">
              The bar above each board pins four links stakeholders ask for: Presentation, Demo, Report and Documentation.
              Click <em>+ Add link</em>, paste a full URL and press <Kbd>Enter</Kbd>. A filled dot means the link is set.
            </Feature>
          </Section>

          <Section id="board" n={3} title="Reading the board">
            <p>
              Four columns show where work stands. Every card shows the same things in the same place: title, type icon, due
              status, label and owner. The card colour tells you how urgent it is.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {states.map((s) => (
                <figure key={s.title} className="space-y-2">
                  <div aria-hidden className="pointer-events-none">
                    <TaskCardBody task={s.task} label={SAMPLE_LABEL} />
                  </div>
                  <figcaption className="text-[13px]">
                    <strong className="text-fg">{s.title}.</strong> {s.text}
                  </figcaption>
                </figure>
              ))}
            </div>
            <p className="text-[13px]">
              Colour is never the only signal: every state also has an icon and text. If colours are hard to tell apart,
              switch to a colour-blind mode in <Ref>Settings → Accessibility</Ref>.
            </p>
          </Section>

          <Section id="tasks" n={4} title="Working with tasks">
            <div className="grid gap-px border border-line bg-line sm:grid-cols-2">
              <Tile icon={MousePointerClick} title="Open a task">
                Click a card (or focus it and press <Kbd>Enter</Kbd>) to see its details, context and prompt history.
              </Tile>
              <Tile icon={Pencil} title="Edit or delete">
                In a task, choose <strong className="text-fg">Edit</strong>. Or use <strong className="text-fg">Edit task</strong>{' '}
                in the toolbar to pick any task from a list. Delete asks you to confirm.
              </Tile>
              <Tile icon={GripVertical} title="Move between stages">
                Drag a card to another column. With a keyboard: focus it, <Kbd>Space</Kbd> to pick up, <Kbd>←</Kbd>
                <Kbd>→</Kbd> to choose a column, <Kbd>Space</Kbd> to drop.
              </Tile>
              <Tile icon={ArrowRightLeft} title="Hand off">
                In a task, use <strong className="text-fg">Hand off to…</strong> to reassign it in one step. The avatars in the
                toolbar show who owns how many open tasks.
              </Tile>
            </div>
          </Section>

          <Section id="context" n={5} title="AI context and prompts">
            <p>
              This is what makes Vibe Tracker different: the reasoning behind a task travels with it.
            </p>
            <Feature icon={MessageSquareText} title="Context">
              When you create or edit a task, fill in the Context template: <em>Background</em>, <em>Constraints</em>,{' '}
              <em>Tried so far</em> and <em>Pick up</em>. Note which AI tool you used. Cards with context show a speech-bubble
              icon.
            </Feature>
            <Feature icon={Copy} title="Copy context">
              <strong className="text-fg">Copy context</strong> puts the title, description and context on your clipboard as
              one Markdown briefing. Paste it into Claude, ChatGPT, Cursor or a message to a teammate and carry on.
            </Feature>
            <Feature icon={History} title="Prompt history">
              Each task keeps a timeline of the prompts used on it, newest first, so you can see how the work got where it is.
            </Feature>
          </Section>

          <Section id="settings" n={6} title="Settings and accessibility">
            <Feature icon={Settings} title="Settings">
              Open <Ref>Settings</Ref> from the bottom of the sidebar (or press <Kbd>,</Kbd>). Profile and Teams are previews of
              account features that are coming.
            </Feature>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="text-fg">Colour vision:</strong> red–green safe, blue–yellow safe, or monochrome. This
                re-colours urgency, task types and stages across the whole app.
              </li>
              <li>
                <strong className="text-fg">Reduce motion:</strong> turns off animations and transitions.
              </li>
              <li>
                <strong className="text-fg">Light or dark:</strong> the moon/sun button in the top bar, or <Kbd>T</Kbd>.
              </li>
              <li>
                <strong className="text-fg">Screen readers:</strong> cards announce their title and whether they have context;
                moving a task is announced step by step. Press <Kbd>Tab</Kbd> on any page for “Skip to main content”.
              </li>
            </ul>
          </Section>

          <Section id="shortcuts" n={7} title="Keyboard shortcuts">
            <p>Single-key shortcuts work anywhere except while typing or when a dialog is open.</p>
            <ShortcutList />
          </Section>
        </article>
      </div>
    </AppShell>
  );
}

function Section({ id, n, title, children }: { id: string; n: number; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 space-y-4">
      <h2 id={`${id}-title`} className="flex items-baseline gap-3 border-b border-line pb-2 text-[18px] font-semibold tracking-[-0.01em] text-fg">
        <span className="tabular text-[13px] font-medium text-fg-subtle">{String(n).padStart(2, '0')}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Step({ icon: Icon, n, title, children }: { icon: LucideIcon; n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="bg-surface p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center bg-brand text-[12px] font-semibold text-brand-fg">{n}</span>
        <Icon className="h-4 w-4 text-fg-subtle" aria-hidden />
      </div>
      <h3 className="mb-1 text-[14px] font-semibold text-fg">{title}</h3>
      <p className="text-[13px] leading-5">{children}</p>
    </li>
  );
}

function Tile({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface p-4">
      <h3 className="mb-1 flex items-center gap-2 text-[14px] font-semibold text-fg">
        <Icon className="h-4 w-4 text-brand-ink" aria-hidden />
        {title}
      </h3>
      <p className="text-[13px] leading-5">{children}</p>
    </div>
  );
}

function Feature({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 border border-line bg-surface p-4">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-ink" aria-hidden />
      <div>
        <h3 className="text-[14px] font-semibold text-fg">{title}</h3>
        <p className="mt-0.5 text-[13px] leading-5">{children}</p>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mx-0.5 inline-flex min-w-[1.5rem] items-center justify-center border border-b-2 border-line-strong bg-surface px-1 font-mono text-[11px] text-fg">
      {children}
    </kbd>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="bg-muted px-1 font-mono text-[12px] text-fg">{children}</code>;
}

function Ref({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-fg">{children}</strong>;
}
