'use client';

import { Crown, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { createTeam, getMyTeams, joinTeam } from '@/app/actions';
import type { Team } from '@/lib/types';
import CopyButton from '../CopyButton';
import { btn } from '../Modal';
import { PanelTitle, settingsField, settingsLabel } from './ui';

type Message = { kind: 'ok' | 'error'; text: string } | null;

function StatusMessage({ id, message }: { id: string; message: Message }) {
  if (!message) return null;
  return (
    <p
      id={id}
      role={message.kind === 'error' ? 'alert' : 'status'}
      className={`mt-2 text-[13px] ${message.kind === 'error' ? 'text-red-700 dark:text-red-300' : 'text-brand-ink'}`}
    >
      {message.text}
    </p>
  );
}

// Your teams (from the database) and joining one by code.
export function TeamsTab() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<Message>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    getMyTeams().then((r) => (r.ok ? setTeams(r.teams) : setMessage({ kind: 'error', text: r.error })));
  }, []);

  function join(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await joinTeam(code);
      if (r.ok) {
        setTeams(r.teams);
        setCode('');
        setMessage({ kind: 'ok', text: r.message ?? 'Joined.' });
        router.refresh(); // the team's projects appear in the sidebar and project list
      } else {
        setMessage({ kind: 'error', text: r.error });
      }
    });
  }

  return (
    <div>
      <PanelTitle title="Teams" description="Projects in your teams appear under Team projects for everyone in the team." />

      {teams === null ? (
        <p className="mb-8 text-[13px] text-fg-subtle">Loading your teams…</p>
      ) : teams.length === 0 ? (
        <p className="mb-8 border border-dashed border-line-strong px-3 py-4 text-center text-[13px] text-fg-subtle">
          You&apos;re not in any teams yet. Join one below or create one.
        </p>
      ) : (
        <ul className="mb-8 divide-y divide-line border border-line">
          {teams.map((team) => (
            <li key={team.id} className="flex items-center gap-3 p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-muted text-fg-muted">
                <Users className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-[14px] font-medium text-fg">
                  {team.name}
                  {team.role === 'owner' && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-fg-subtle" title="You own this team">
                      <Crown className="h-3 w-3" aria-hidden />
                      Owner
                    </span>
                  )}
                </p>
                <p className="text-[12px] text-fg-subtle">
                  <span className="font-mono">{team.code}</span> · {team.memberCount} {team.memberCount === 1 ? 'member' : 'members'}
                </p>
              </div>
              <CopyButton getText={() => team.code} label="Copy code" />
              <Link href={`/projects/new?team=${team.id}`} className={btn.secondary}>
                New project
              </Link>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={join} className="border border-line p-4">
        <h4 className="text-[14px] font-semibold text-fg">Join a team</h4>
        <p className="mt-1 text-[13px] text-fg-subtle">Ask a teammate for their team code (e.g. VT-PLAT).</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="w-48">
            <label htmlFor="team-code" className={settingsLabel}>
              Team code
            </label>
            <input
              id="team-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setMessage(null);
              }}
              placeholder="VT-AB12"
              maxLength={7}
              className={`${settingsField} font-mono uppercase`}
              aria-describedby={message ? 'team-code-msg' : undefined}
            />
          </div>
          <button type="submit" disabled={pending || !code.trim()} className={btn.primary}>
            {pending ? 'Joining…' : 'Join team'}
          </button>
        </div>
        <StatusMessage id="team-code-msg" message={message} />
      </form>
    </div>
  );
}

// Create a team (you become its owner) and share its code.
export function CreateTeamTab({ onViewTeams }: { onViewTeams: () => void }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [created, setCreated] = useState<{ name: string; code: string } | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [pending, startTransition] = useTransition();

  function create(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await createTeam(name, description);
      if (r.ok && r.code) {
        setCreated({ name: name.trim(), code: r.code });
        setName('');
        setDescription('');
        setMessage(null);
        router.refresh();
      } else if (!r.ok) {
        setMessage({ kind: 'error', text: r.error });
      }
    });
  }

  return (
    <div>
      <PanelTitle title="Create a team" description="You'll be the owner. Share the code so others can join." />

      {created && (
        <div role="status" className="mb-6 border border-brand bg-brand-soft p-4">
          <p className="text-[14px] font-medium text-fg">Created “{created.name}”</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px] text-fg-muted">
            Team code: <span className="font-mono text-[15px] font-semibold text-fg">{created.code}</span>
            <CopyButton getText={() => created.code} label="Copy code" />
            <button type="button" onClick={onViewTeams} className="font-medium text-brand-ink hover:underline">
              View teams
            </button>
          </div>
        </div>
      )}

      <form onSubmit={create} className="max-w-md space-y-5">
        <div>
          <label htmlFor="new-team-name" className={settingsLabel}>
            Team name <span className="text-red-600">*</span>
          </label>
          <input
            id="new-team-name"
            required
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Payments squad"
            className={settingsField}
          />
        </div>
        <div>
          <label htmlFor="new-team-description" className={settingsLabel}>
            Description
          </label>
          <textarea
            id="new-team-description"
            rows={3}
            maxLength={300}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this team work on?"
            className={settingsField}
          />
        </div>
        <button type="submit" disabled={pending} className={btn.primary}>
          {pending ? 'Creating…' : 'Create team'}
        </button>
        <StatusMessage id="create-team-msg" message={message} />
      </form>
    </div>
  );
}
