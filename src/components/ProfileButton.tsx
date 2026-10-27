'use client';

import { LogOut } from 'lucide-react';
import { useTransition } from 'react';
import { signOut } from '@/app/actions';
import Avatar from './Avatar';
import { useSettings } from './settings/SettingsProvider';

// Bottom of the sidebar: who's signed in (opens their profile) and a sign-out button.
export default function ProfileButton({ name, username, avatar }: { name: string; username: string | null; avatar: string | null }) {
  const { openSettings } = useSettings();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => openSettings('profile')}
        title="Your profile"
        className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 text-left transition-colors hover:bg-sidebar-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <Avatar name={name} avatar={avatar} size={28} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium leading-4 text-sidebar-fg">{name}</span>
          {username && <span className="block truncate text-[11px] leading-4 text-sidebar-fg-muted">@{username}</span>}
        </span>
        <span className="sr-only">Open your profile</span>
      </button>
      <button
        type="button"
        onClick={() => startTransition(() => signOut())}
        disabled={pending}
        aria-label="Sign out"
        title="Sign out"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sidebar-fg-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
      >
        <LogOut className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
