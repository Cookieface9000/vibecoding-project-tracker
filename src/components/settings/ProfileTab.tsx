'use client';

import { Shuffle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { getProfile, updateProfile } from '@/app/actions';
import { LETTER_KEYS, randomPatternKeys } from '@/lib/avatar';
import type { Profile } from '@/lib/types';
import Avatar from '../Avatar';
import { btn } from '../Modal';
import { PanelTitle, PlaceholderNote, settingsField, settingsLabel } from './ui';

// The current user's profile: name, username, email and a generated picture.
// Pictures are drawn from a short key (lib/avatar.ts), so nothing is uploaded or stored.

export default function ProfileTab() {
  const router = useRouter();
  const [saved, setSaved] = useState<Profile | null>(null);
  const [form, setForm] = useState<Profile | null>(null);
  const [patterns, setPatterns] = useState<string[]>([]);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setPatterns(randomPatternKeys(8));
    getProfile().then((r) => {
      if (r.ok) {
        setSaved(r.profile);
        setForm(r.profile);
      } else {
        setMessage({ kind: 'error', text: r.error });
      }
    });
  }, []);

  if (!form || !saved) {
    return (
      <div>
        <PanelTitle title="User profile" description="How you appear to teammates." />
        <p className="text-[13px] text-fg-subtle">{message?.text ?? 'Loading your profile…'}</p>
      </div>
    );
  }

  const set = (patch: Partial<Profile>) => {
    setForm({ ...form, ...patch });
    setMessage(null);
  };
  const changed = JSON.stringify(form) !== JSON.stringify(saved);
  // Keep the saved pattern in the grid even after shuffling, so it stays selectable.
  const patternChoices = saved.avatar?.startsWith('pattern:') && !patterns.includes(saved.avatar) ? [saved.avatar, ...patterns.slice(0, 7)] : patterns;

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await updateProfile({ name: form!.name, username: form!.username, email: form!.email, avatar: form!.avatar });
      if (r.ok) {
        setSaved(r.profile);
        setForm(r.profile);
        setMessage({ kind: 'ok', text: r.message ?? 'Saved.' });
        router.refresh(); // sidebar, cards and member lists show the new name and picture
      } else {
        setMessage({ kind: 'error', text: r.error });
      }
    });
  }

  return (
    <form onSubmit={save}>
      <PanelTitle title="User profile" description="How you appear to teammates." />
      <PlaceholderNote>
        There&apos;s no sign-in yet: switch between users with &ldquo;Acting as&rdquo; at the bottom of the sidebar. Changes here apply to the user
        you&apos;re acting as.
      </PlaceholderNote>

      <div className="mb-5 flex items-center gap-4">
        <Avatar name={form.name || saved.name} avatar={form.avatar} size={64} label="Your picture" />
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{form.name || saved.name}</p>
          <p className="truncate text-sm text-fg-subtle">@{form.username || saved.username}</p>
        </div>
      </div>

      <fieldset className="mb-6">
        <legend className={settingsLabel}>Picture</legend>
        <div className="mt-2 space-y-3">
          <PickerRow label="Initials">
            <Choice selected={form.avatar === null} onSelect={() => set({ avatar: null })} label="Initials">
              <Avatar name={form.name || saved.name} avatar={null} size={36} />
            </Choice>
          </PickerRow>
          <PickerRow label="Letters">
            {LETTER_KEYS.map((key) => (
              <Choice key={key} selected={form.avatar === key} onSelect={() => set({ avatar: key })} label={`Letter ${key.slice(-1)}`}>
                <Avatar name="" avatar={key} size={36} />
              </Choice>
            ))}
          </PickerRow>
          <PickerRow
            label="Patterns"
            action={
              <button type="button" onClick={() => setPatterns(randomPatternKeys(8))} className={`${btn.ghost} !h-7 !px-2`}>
                <Shuffle className="h-3.5 w-3.5" aria-hidden />
                Shuffle
              </button>
            }
          >
            {patternChoices.map((key, i) => (
              <Choice key={key} selected={form.avatar === key} onSelect={() => set({ avatar: key })} label={`Pattern ${i + 1}`}>
                <Avatar name="" avatar={key} size={36} />
              </Choice>
            ))}
          </PickerRow>
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="profile-name" className={settingsLabel}>
            Display name
          </label>
          <input id="profile-name" value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={60} required className={settingsField} />
        </div>
        <div>
          <label htmlFor="profile-username" className={settingsLabel}>
            Username
          </label>
          <input
            id="profile-username"
            value={form.username}
            onChange={(e) => set({ username: e.target.value.toLowerCase() })}
            maxLength={30}
            required
            className={settingsField}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="profile-email" className={settingsLabel}>
            Email <span className="font-normal text-fg-subtle">(optional)</span>
          </label>
          <input
            id="profile-email"
            type="email"
            value={form.email}
            onChange={(e) => set({ email: e.target.value })}
            maxLength={120}
            placeholder="you@example.com"
            className={settingsField}
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        {message && (
          <p role={message.kind === 'error' ? 'alert' : 'status'} className={`text-[13px] ${message.kind === 'error' ? 'text-red-700 dark:text-red-300' : 'text-brand-ink'}`}>
            {message.text}
          </p>
        )}
        <button type="submit" disabled={pending || !changed} className={btn.primary}>
          {pending ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </form>
  );
}

function PickerRow({ label, action, children }: { label: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[12px] text-fg-subtle">{label}</span>
        {action}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Choice({ selected, onSelect, label, children }: { selected: boolean; onSelect: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={label}
      title={label}
      className={`rounded-full p-0.5 ring-offset-2 ring-offset-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
        selected ? 'ring-2 ring-brand' : 'hover:ring-1 hover:ring-line-strong'
      }`}
    >
      {children}
    </button>
  );
}
