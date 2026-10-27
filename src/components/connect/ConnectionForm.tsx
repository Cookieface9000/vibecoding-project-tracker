'use client';

import { KeyRound, X } from 'lucide-react';
import { useState, useTransition } from 'react';
import { createConnectionAction } from '@/app/connect/actions';
import CopyButton from '@/components/CopyButton';
import { btn, field, fieldHint, fieldLabel } from '@/components/ui';

// Create an AI connection, then show its URL once with setup steps for each app.

export interface ProjectOption {
  id: string;
  label: string;
}

const DAYS = [
  { value: 1, label: '1 day' },
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
];

export default function ConnectionForm({ projects, demoProjectId }: { projects: ProjectOption[]; demoProjectId: string | null }) {
  const [name, setName] = useState('Reviewer – Claude');
  const [canWrite, setCanWrite] = useState(true);
  const [projectId, setProjectId] = useState(demoProjectId ?? '');
  const [days, setDays] = useState(14);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createConnectionAction({ name, canWrite, projectId: projectId || null, days });
      if (result.ok) setUrl(result.url);
      else setError(result.error);
    });
  }

  if (url) return <NewConnection url={url} onDone={() => setUrl(null)} />;

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <label className="sm:col-span-2">
        <span className={fieldLabel}>Name</span>
        <input className={field} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
        <p className={fieldHint}>Shown in the board history next to everything this AI does.</p>
      </label>

      <fieldset className="sm:col-span-2">
        <legend className={fieldLabel}>Access</legend>
        <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
          {[
            { value: false, title: 'Read only', text: 'See boards, tasks, context and history.' },
            { value: true, title: 'Can move tasks', text: 'Also move, hand off, block, log prompts and update context. Never delete.' },
          ].map((option) => (
            <label
              key={option.title}
              className={`flex cursor-pointer gap-2.5 rounded-md border px-3 py-2.5 text-[13px] ${
                canWrite === option.value ? 'border-brand bg-brand-soft' : 'border-line-strong bg-surface hover:bg-hover'
              }`}
            >
              <input type="radio" name="access" className="mt-0.5 accent-brand" checked={canWrite === option.value} onChange={() => setCanWrite(option.value)} />
              <span>
                <span className="block font-medium text-fg">{option.title}</span>
                <span className="block text-[12px] text-fg-subtle">{option.text}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label>
        <span className={fieldLabel}>Projects it can see</span>
        <select className={field} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              Only {p.label}
            </option>
          ))}
          <option value="">All my projects</option>
        </select>
        <p className={fieldHint}>For a reviewer, keep it to the Demo Board.</p>
      </label>

      <label>
        <span className={fieldLabel}>Expires after</span>
        <select className={field} value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {DAYS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <p className={fieldHint}>You can revoke it sooner at any time.</p>
      </label>

      {error && (
        <p role="alert" className="text-[13px] text-red-700 sm:col-span-2 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="sm:col-span-2">
        <button type="submit" className={btn.primary} disabled={pending}>
          <KeyRound className="h-4 w-4" aria-hidden />
          {pending ? 'Creating…' : 'Create connection'}
        </button>
      </div>
    </form>
  );
}

type Tab = 'claude' | 'code' | 'other';

function NewConnection({ url, onDone }: { url: string; onDone: () => void }) {
  const [tab, setTab] = useState<Tab>('claude');
  const local = /^http:\/\/(localhost|127\.0\.0\.1)/.test(url);
  const secret = url.slice(url.lastIndexOf('/') + 1);
  const bearerUrl = url.slice(0, url.indexOf('/api/mcp/')) + '/api/mcp';
  const command = `claude mcp add --transport http vibe-tracker "${url}"`;

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-brand/40 bg-brand-soft p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-fg">Connection created. Copy its URL now</p>
            <p className="mt-0.5 text-[12px] text-fg-subtle">It&apos;s shown only once. Anyone with it can use this connection until it expires or you revoke it.</p>
          </div>
          <button type="button" onClick={onDone} className={btn.ghost} aria-label="Close and create another">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 break-all rounded-md border border-line bg-surface px-2.5 py-1.5 font-mono text-[12px] text-fg">{url}</code>
          <CopyButton getText={() => url} label="Copy URL" />
        </div>
        {local && (
          <p className="mt-3 text-[12px] text-amber-700 dark:text-amber-400">
            This is a local address: Claude on the web can&apos;t reach it. Use Claude Code on this computer, or create the connection on the hosted site.
          </p>
        )}
      </div>

      <div>
        <div role="tablist" aria-label="Where to use it" className="flex gap-1 border-b border-line">
          {(
            [
              ['claude', 'Claude (web & desktop)'],
              ['code', 'Claude Code'],
              ['other', 'Other MCP apps'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-medium ${tab === id ? 'border-brand text-fg' : 'border-transparent text-fg-muted hover:text-fg'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div role="tabpanel" className="pt-3 text-[13px] leading-6 text-fg-muted">
          {tab === 'claude' && (
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                In Claude, open <strong className="text-fg">Settings → Connectors</strong>.
              </li>
              <li>
                Choose <strong className="text-fg">Add custom connector</strong>, name it <strong className="text-fg">Vibe Tracker</strong> and paste the URL.
                Leave the advanced (OAuth) settings empty.
              </li>
              <li>In a new chat, make sure Vibe Tracker is switched on in the tools menu.</li>
              <li>
                Ask: <em>&ldquo;Using Vibe Tracker, show me the Demo board.&rdquo;</em>
              </li>
              <li className="text-fg-subtle">
                Custom connectors depend on your Claude plan. If you can&apos;t add one, use <strong>Try it</strong> below: it runs the same tools.
              </li>
            </ol>
          )}
          {tab === 'code' && (
            <div className="space-y-2">
              <p>Run this in a terminal, then start Claude Code and ask about the Demo board:</p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 break-all rounded-md border border-line bg-muted px-2.5 py-1.5 font-mono text-[12px] text-fg">{command}</code>
                <CopyButton getText={() => command} label="Copy command" />
              </div>
            </div>
          )}
          {tab === 'other' && (
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Transport: <strong className="text-fg">Streamable HTTP</strong>, at the URL above. No sign-in needed.
              </li>
              <li>
                Or, for apps that send headers: <code className="font-mono text-[12px]">{bearerUrl}</code> with{' '}
                <code className="font-mono text-[12px]">Authorization: Bearer {secret.slice(0, 7)}…</code> (the last part of the URL).
              </li>
              <li>
                To browse the tools without an AI: <code className="font-mono text-[12px]">npx @modelcontextprotocol/inspector</code>.
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
