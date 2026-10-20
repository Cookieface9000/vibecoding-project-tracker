'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { createProject, type ProjectFormState } from '@/app/actions';
import { deriveProjectCode, normaliseProjectCode } from '@/lib/project-code';
import type { Team } from '@/lib/types';
import { btn, field, fieldHint, fieldLabel } from './Modal';

const input = field;
const label = fieldLabel;
const hint = fieldHint;

export default function NewProjectForm({ teams, defaultTeamId = '' }: { teams: Team[]; defaultTeamId?: string }) {
  const [state, formAction, pending] = useActionState<ProjectFormState, FormData>(createProject, {});
  const [teamId, setTeamId] = useState(state.fields?.teamId ?? defaultTeamId);
  const selectedTeam = teams.find((t) => t.id === teamId);
  const [name, setName] = useState(state.fields?.name ?? '');
  // The code follows the name until the user edits it themselves.
  const [code, setCode] = useState(state.fields?.code ?? '');
  const [codeEdited, setCodeEdited] = useState(Boolean(state.fields?.code));
  const [client, setClient] = useState(state.fields?.client ?? '');
  const [description, setDescription] = useState(state.fields?.description ?? '');
  const shownCode = codeEdited ? code : deriveProjectCode(name);

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-xl border border-line bg-surface p-6 shadow-card"
    >
      {state.error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
          {state.error}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
        <div>
          <label htmlFor="name" className={label}>
            Project name <span className="text-red-600">*</span>
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={80}
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Customer Portal"
            className={input}
          />
        </div>
        <div>
          <label htmlFor="code" className={label}>
            Code
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 mt-[3px] -translate-y-1/2 font-mono text-[13px] text-fg-subtle">#</span>
            <input
              id="code"
              name="code"
              maxLength={6}
              value={shownCode}
              onChange={(e) => {
                setCodeEdited(true);
                setCode(normaliseProjectCode(e.target.value));
              }}
              placeholder="CP"
              className={`${input} pl-6 font-mono uppercase`}
              aria-describedby="code-hint"
            />
          </div>
          <p id="code-hint" className={hint}>
            2–6 letters
          </p>
        </div>
      </div>

      {/* Team: decides who else can see and work in this project. */}
      <div>
        <label htmlFor="teamId" className={label}>
          Team
        </label>
        <select
          id="teamId"
          name="teamId"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          aria-describedby="team-hint"
          className={input}
        >
          <option value="">Personal (only you)</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.code}) · {t.memberCount} {t.memberCount === 1 ? 'member' : 'members'}
            </option>
          ))}
        </select>
        <p id="team-hint" className={hint}>
          {selectedTeam
            ? `Everyone in ${selectedTeam.name} can see and work in this project.`
            : teams.length
              ? 'Only you will see this project. Pick a team to share it.'
              : 'Only you will see this project. Join or create a team in Settings to share projects.'}
        </p>
      </div>

      <div>
        <label htmlFor="client" className={label}>
          Client or stakeholder
        </label>
        <input
          id="client"
          name="client"
          maxLength={80}
          value={client}
          onChange={(e) => setClient(e.target.value)}
          placeholder="e.g. Internal, Platform team, Acme Ltd"
          className={input}
        />
      </div>

      <div>
        <label htmlFor="description" className={label}>
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this project for?"
          className={input}
        />
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-line pt-5">
        <Link
          href="/"
          className={btn.secondary}
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending}
          className={btn.primary}
        >
          {pending ? 'Creating…' : 'Create project'}
        </button>
      </div>
    </form>
  );
}
