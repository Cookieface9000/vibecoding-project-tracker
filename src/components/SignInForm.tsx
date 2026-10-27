'use client';

import { LogIn } from 'lucide-react';
import { useRef, useState, useTransition } from 'react';
import { signIn } from '@/app/actions';
import Avatar from './Avatar';
import { btn, field, fieldHint, fieldLabel } from './ui';

// Demo sign-in: pick an existing user (their details fill in) or type a username, then sign in.
// There are no passwords and no way to register.

interface SignInUser {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
}

export default function SignInForm({ users, next, currentName }: { users: SignInUser[]; next: string; currentName: string | null }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const submitRef = useRef<HTMLButtonElement>(null);
  const chosen = users.find((u) => u.username === username.trim().toLowerCase().replace(/^@/, ''));

  function pick(user: SignInUser) {
    setUsername(user.username);
    setError(null);
    submitRef.current?.focus();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await signIn(username, next); // redirects on success
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-line bg-surface p-6 shadow-card">
      <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-fg">Sign in</h1>
      <p className="mt-1 text-[13px] text-fg-subtle">
        Demo sign-in: choose an existing user to fill in their details. There are no passwords, and new accounts can&apos;t be created.
      </p>
      {currentName && (
        <p className="mt-3 rounded-md border border-line bg-muted px-3 py-2 text-[13px] text-fg-muted">
          You&apos;re signed in as <strong className="text-fg">{currentName}</strong>. Signing in again switches user.
        </p>
      )}

      <fieldset className="mt-5">
        <legend className={fieldLabel}>Existing users</legend>
        <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {users.map((u) => {
            const selected = chosen?.id === u.id;
            return (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => pick(u)}
                  aria-pressed={selected}
                  className={`flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                    selected ? 'border-brand bg-brand-soft' : 'border-line hover:bg-hover'
                  }`}
                >
                  <Avatar name={u.name} avatar={u.avatar} size={28} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-fg">{u.name}</span>
                    <span className="block truncate text-[11px] text-fg-subtle">@{u.username}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="sign-in-name" className={fieldLabel}>
            Display name
          </label>
          <input id="sign-in-name" value={chosen?.name ?? ''} readOnly placeholder="Filled in when you choose a user" className={field} />
        </div>
        <div>
          <label htmlFor="sign-in-username" className={fieldLabel}>
            Username
          </label>
          <input
            id="sign-in-username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError(null);
            }}
            autoComplete="username"
            placeholder="e.g. user2"
            required
            className={field}
            aria-describedby={error ? 'sign-in-error' : undefined}
          />
          <p className={fieldHint}>Or type an existing username.</p>
        </div>
      </div>

      {error && (
        <p id="sign-in-error" role="alert" className="mt-3 text-[13px] text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      <button ref={submitRef} type="submit" disabled={pending || !username.trim()} className={`${btn.primary} mt-5 w-full`}>
        <LogIn className="h-4 w-4" aria-hidden />
        {pending ? 'Signing in…' : chosen ? `Sign in as ${chosen.name}` : 'Sign in'}
      </button>
    </form>
  );
}
