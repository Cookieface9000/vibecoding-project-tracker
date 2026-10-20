'use client';

import { CheckCircle2, Users } from 'lucide-react';
import { useState } from 'react';
import CopyButton from '../CopyButton';
import { btn } from '../Modal';
import { PanelTitle, PlaceholderNote, settingsField, settingsLabel } from './ui';

export interface Team {
  name: string;
  code: string;
  members: number;
  current?: boolean;
}

const CODE_FORMAT = /^VT-[A-Z0-9]{4}$/;

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'VT-' + Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// Placeholder: teams live only in this modal's memory until accounts exist.
export function TeamsTab({ teams, setTeams }: { teams: Team[]; setTeams: React.Dispatch<React.SetStateAction<Team[]>> }) {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  function join(e: React.FormEvent) {
    e.preventDefault();
    const normalised = code.trim().toUpperCase();
    if (!CODE_FORMAT.test(normalised)) {
      setMessage({ kind: 'error', text: 'Team codes look like VT-AB12.' });
      return;
    }
    if (teams.some((t) => t.code === normalised)) {
      setMessage({ kind: 'error', text: `You're already in ${normalised}.` });
      return;
    }
    setTeams((current) => [...current, { name: `Team ${normalised}`, code: normalised, members: 3 }]);
    setMessage({ kind: 'ok', text: `Joined ${normalised} (placeholder).` });
    setCode('');
  }

  function switchTo(teamCode: string) {
    setTeams((current) => current.map((t) => ({ ...t, current: t.code === teamCode })));
  }

  return (
    <div>
      <PanelTitle title="Teams" description="The team you're working in, and any others you've joined." />
      <PlaceholderNote>Placeholder: joining and switching only lasts until you close Settings.</PlaceholderNote>

      <ul className="mb-8 space-y-2">
        {teams.map((team) => (
          <li
            key={team.code}
            className={`flex items-center gap-3 rounded-lg border p-3 ${
              team.current ? 'border-brand/50 bg-brand/5 dark:border-brand-dark/50 dark:bg-brand-dark/10' : 'border-slate-200 dark:border-slate-700'
            }`}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <Users className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-900 dark:text-white">{team.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-mono">{team.code}</span> · {team.members} members
              </p>
            </div>
            {team.current ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-brand dark:text-brand-dark">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                Current team
              </span>
            ) : (
              <button type="button" onClick={() => switchTo(team.code)} className={btn.secondary}>
                Switch
              </button>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={join} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
        <h4 className="font-medium text-slate-900 dark:text-white">Join a team</h4>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ask a teammate for their team code.</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="w-48">
            <label htmlFor="team-code" className={settingsLabel}>
              Team code
            </label>
            <input
              id="team-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="VT-AB12"
              maxLength={7}
              className={`${settingsField} font-mono uppercase`}
              aria-describedby={message ? 'team-code-msg' : undefined}
            />
          </div>
          <button type="submit" className={btn.primary}>
            Join team
          </button>
        </div>
        {message && (
          <p
            id="team-code-msg"
            role={message.kind === 'error' ? 'alert' : 'status'}
            className={`mt-2 text-sm ${message.kind === 'error' ? 'text-red-700 dark:text-red-300' : 'text-brand dark:text-brand-dark'}`}
          >
            {message.text}
          </p>
        )}
      </form>
    </div>
  );
}

export function CreateTeamTab({
  setTeams,
  onViewTeams,
}: {
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
  onViewTeams: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [created, setCreated] = useState<Team | null>(null);

  function create(e: React.FormEvent) {
    e.preventDefault();
    const team: Team = { name: name.trim(), code: randomCode(), members: 1 };
    setTeams((current) => [...current, team]);
    setCreated(team);
    setName('');
    setDescription('');
  }

  return (
    <div>
      <PanelTitle title="Create a team" description="Start a team and share its code so others can join." />
      <PlaceholderNote>Placeholder: the team only exists until you close Settings.</PlaceholderNote>

      {created && (
        <div role="status" className="mb-6 rounded-lg border border-brand/40 bg-brand/5 p-4 dark:border-brand-dark/40 dark:bg-brand-dark/10">
          <p className="font-medium text-slate-900 dark:text-white">Created “{created.name}”</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
            Team code: <span className="font-mono text-base font-semibold text-slate-900 dark:text-white">{created.code}</span>
            <CopyButton getText={() => created.code} label="Copy code" />
            <button type="button" onClick={onViewTeams} className="text-sm font-medium text-brand hover:underline dark:text-brand-dark">
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
        <button type="submit" className={btn.primary}>
          Create team
        </button>
      </form>
    </div>
  );
}
