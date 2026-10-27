import ActivityList, { type ActivityRow } from '@/components/connect/ActivityList';
import ConnectionForm from '@/components/connect/ConnectionForm';
import ConnectionList, { type ConnectionRow } from '@/components/connect/ConnectionList';
import DemoBoardCard from '@/components/connect/DemoBoardCard';
import TryIt from '@/components/connect/TryIt';
import Notice, { SetupNotice } from '@/components/Notice';
import PageHeader from '@/components/PageHeader';
import { listMembers, listProjects, listTasks } from '@/lib/data';
import { listConnections, listRecentCalls } from '@/lib/mcp/connections';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export const metadata = { title: 'Connect an AI · Vibe Tracker' };
export const dynamic = 'force-dynamic';

const EXAMPLES = [
  'Using Vibe Tracker, show me the Demo board.',
  "What's blocking DEMO-6?",
  'Move DEMO-3 to Done.',
  'Hand DEMO-1 to Sam Patel.',
  'Pick up DEMO-2: what should I do next?',
];

function ago(iso: string | null, now: number) {
  if (!iso) return 'never';
  const mins = Math.round((now - Date.parse(iso)) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

function untilText(iso: string, now: number) {
  const days = Math.ceil((Date.parse(iso) - now) / 86_400_000);
  if (days <= 0) return `expired ${iso.slice(0, 10)}`;
  return days === 1 ? 'expires within a day' : `expires in ${days} days`;
}

export default async function ConnectPage() {
  return (
    <>
      <PageHeader>
        <h1 className="text-[14px] font-semibold text-fg">Connect an AI</h1>
        <span className="hidden text-[13px] text-fg-subtle sm:inline">Let Claude read and move your board</span>
      </PageHeader>
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">{isSupabaseConfigured() ? <Content /> : <SetupNotice />}</main>
    </>
  );
}

async function Content() {
  let data;
  try {
    const [projects, members, connections, calls, demo] = await Promise.all([
      listProjects(),
      listMembers(),
      listConnections(),
      listRecentCalls(30),
      supabase().from('projects').select('id').eq('is_demo', true).order('created_at').limit(1).maybeSingle(),
    ]);
    const boards = await Promise.all(projects.map((p) => listTasks(p)));
    const taskOptions = boards.flat().map((t) => ({ ref: t.ref, title: t.title }));
    data = { projects, members, connections, calls, taskOptions, demoId: (demo.data?.id as string | undefined) ?? null };
  } catch (err) {
    return <Notice>{(err as Error).message}. Have you run the latest <code>supabase/schema.sql</code>?</Notice>;
  }

  const now = Date.now();
  const { projects, members, connections, calls, taskOptions, demoId } = data;
  const demo = projects.find((p) => p.id === demoId);
  const projectOptions = [...projects].sort((a, b) => Number(b.id === demoId) - Number(a.id === demoId)).map((p) => ({ id: p.id, label: `${p.name} (#${p.code})` }));

  const connectionRows: ConnectionRow[] = connections.map((c) => ({
    id: c.id,
    name: c.name,
    hint: c.hint,
    canWrite: c.canWrite,
    scope: c.projectLabel ?? 'All my projects',
    expires: c.state === 'revoked' ? 'revoked' : untilText(c.expiresAt, now),
    lastUsed: `last used ${ago(c.lastUsedAt, now)}`,
    state: c.state,
  }));
  const activityRows: ActivityRow[] = calls.map((c) => ({
    id: c.id,
    when: ago(c.at, now),
    caller: c.caller,
    tool: c.tool,
    summary: c.summary,
    ok: c.ok,
    projectId: typeof c.detail?.projectId === 'string' ? c.detail.projectId : null,
    taskId: typeof c.detail?.taskId === 'string' ? c.detail.taskId : null,
    outcomeId: typeof c.detail?.outcomeId === 'string' ? c.detail.outcomeId : null,
    historyId: typeof c.detail?.historyId === 'string' ? c.detail.historyId : null,
  }));

  return (
    <div className="space-y-12 text-[14px] leading-6 text-fg-muted">
      <section>
        <h2 className="text-[24px] font-semibold tracking-[-0.02em] text-fg">Give an AI access to your board</h2>
        <p className="mt-2 max-w-2xl">
          Vibe Tracker is an MCP server: AI apps like Claude can read your boards, tasks and stored context, and (if you allow it) move
          tasks, hand them off and update their context. Everything an AI does is listed under AI activity below.
        </p>
        <ol className="mt-5 grid gap-px border border-line bg-line sm:grid-cols-3">
          {[
            ['Create a connection', 'Below. For a quick test keep the defaults: it can move tasks on the Demo Board only.'],
            ['Add it to Claude', 'Paste its URL as a custom connector, or use the Claude Code command.'],
            ['Ask about the board', 'Try the examples below and watch the Demo Board change.'],
          ].map(([title, text], i) => (
            <li key={title} className="bg-surface p-4">
              <p className="tabular text-[12px] text-fg-subtle">{String(i + 1).padStart(2, '0')}</p>
              <p className="mt-1 font-medium text-fg">{title}</p>
              <p className="mt-1 text-[13px]">{text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-4">
          <p className="text-[13px] font-medium text-fg">Things to ask</p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {EXAMPLES.map((e) => (
              <li key={e} className="rounded-md border border-line bg-surface px-2.5 py-1 text-[13px] text-fg">
                {e}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Section title="Demo Board" text="A sample board that's safe to rearrange. Reset it any time to undo every change.">
        <DemoBoardCard projectId={demo?.id ?? null} />
      </Section>

      <Section title="New connection" text="Each connection has its own secret URL. Only a fingerprint of it is stored, so copy it when it's shown.">
        <div className="rounded-md border border-line bg-surface p-4">
          {projectOptions.length ? (
            <ConnectionForm key={demo?.id ?? 'no-demo'} projects={projectOptions} demoProjectId={demo?.id ?? null} />
          ) : (
            <p className="text-[13px]">Create the Demo Board or a project first.</p>
          )}
        </div>
      </Section>

      <Section title="Your connections" text="Revoke a connection to cut off its access straight away.">
        <ConnectionList connections={connectionRows} />
      </Section>

      <Section
        id="try-it"
        title="Try it"
        text="No AI app? Run the same tools here. The result is exactly what an AI receives, and changes show on the board and in AI activity."
      >
        <div className="rounded-md border border-line bg-surface p-4">
          <TryIt
            projectCodes={projects.map((p) => p.code)}
            members={members.map((m) => m.name)}
            tasks={taskOptions}
            defaultProject={demo?.code ?? projects[0]?.code ?? ''}
          />
        </div>
      </Section>

      <Section title="AI activity" text="The latest 30 tool calls, newest first. If an AI replaced a task's context, you can restore the previous version.">
        <ActivityList calls={activityRows} />
      </Section>
    </div>
  );
}

function Section({ id, title, text, children }: { id?: string; title: string; text: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">{title}</h2>
      <p className="mb-3 mt-1 text-[13px] text-fg-subtle">{text}</p>
      {children}
    </section>
  );
}
