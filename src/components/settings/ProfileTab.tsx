'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { btn } from '../Modal';
import { PanelTitle, PlaceholderNote, settingsField, settingsLabel } from './ui';

// Placeholder profile: fake data only, nothing is saved or sent anywhere.
const FAKE_PROFILE = {
  displayName: 'Vibe Coder',
  username: 'vibe.coder',
  email: 'you@example.com',
  password: 'placeholder-password',
};

export default function ProfileTab() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      <PanelTitle title="User profile" description="How you appear to teammates." />
      <PlaceholderNote>Placeholder: accounts aren&apos;t connected yet, so these details are examples and can&apos;t be changed.</PlaceholderNote>

      <div className="mb-6 flex items-center gap-4">
        {/* Fake profile picture */}
        <svg viewBox="0 0 64 64" className="h-16 w-16 shrink-0 rounded-full" role="img" aria-label="Profile picture (placeholder)">
          <defs>
            <linearGradient id="avatar-bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#22C55E" />
              <stop offset="1" stopColor="#4F46E5" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" fill="url(#avatar-bg)" />
          <circle cx="32" cy="25" r="11" fill="white" fillOpacity="0.9" />
          <path d="M12 58c3-11 11-17 20-17s17 6 20 17" fill="white" fillOpacity="0.9" />
        </svg>
        <div>
          <p className="font-medium text-fg">{FAKE_PROFILE.displayName}</p>
          <p className="text-sm text-fg-subtle">@{FAKE_PROFILE.username}</p>
          <button type="button" disabled className="mt-1 text-xs font-medium text-brand-ink opacity-60">
            Change picture
          </button>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="profile-name" className={settingsLabel}>
            Display name
          </label>
          <input id="profile-name" disabled defaultValue={FAKE_PROFILE.displayName} className={settingsField} />
        </div>
        <div>
          <label htmlFor="profile-username" className={settingsLabel}>
            Username
          </label>
          <input id="profile-username" disabled defaultValue={FAKE_PROFILE.username} className={settingsField} />
        </div>
        <div>
          <label htmlFor="profile-email" className={settingsLabel}>
            Email
          </label>
          <input id="profile-email" type="email" disabled defaultValue={FAKE_PROFILE.email} className={settingsField} />
        </div>
        <div>
          <label htmlFor="profile-password" className={settingsLabel}>
            Password
          </label>
          <div className="relative">
            <input
              id="profile-password"
              type={showPassword ? 'text' : 'password'}
              disabled
              defaultValue={FAKE_PROFILE.password}
              className={`${settingsField} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className="absolute right-2 top-1/2 mt-[3px] -translate-y-1/2 rounded p-1 text-fg-subtle hover:text-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button type="button" disabled className={btn.primary}>
          Save profile
        </button>
      </div>
    </div>
  );
}
