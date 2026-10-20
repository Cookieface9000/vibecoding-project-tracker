'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { createProject, type ProjectFormState } from '@/app/actions';
import { deriveProjectCode, normaliseProjectCode } from '@/lib/project-code';

const input =
  'mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-brand-dark';
const label = 'block text-sm font-medium text-slate-700 dark:text-slate-200';
const hint = 'mt-1 text-xs text-slate-500 dark:text-slate-400';

export default function NewProjectForm() {
  const [state, formAction, pending] = useActionState<ProjectFormState, FormData>(createProject, {});
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
      className="max-w-xl space-y-5 rounded-xl border border-slate-200 bg-surface-card p-6 shadow-sm dark:border-slate-800 dark:bg-surface-card-dark"
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
            <span className="pointer-events-none absolute left-3 top-1/2 mt-[3px] -translate-y-1/2 font-mono text-sm text-slate-400">#</span>
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

      <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
        <Link
          href="/"
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-60"
        >
          {pending ? 'Creating…' : 'Create project'}
        </button>
      </div>
    </form>
  );
}
