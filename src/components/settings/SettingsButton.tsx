'use client';

import { Settings } from 'lucide-react';
import { comboKeys } from '@/lib/shortcuts';
import { useSettings } from './SettingsProvider';

// Cog at the bottom of the sidebar.
export default function SettingsButton() {
  const { openSettings, shortcuts } = useSettings();
  return (
    <button
      type="button"
      onClick={() => openSettings()}
      aria-keyshortcuts={shortcuts.openSettings}
      className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-[15px] text-slate-300 transition-colors hover:bg-white/[0.04] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300"
    >
      <Settings className="h-[18px] w-[18px] text-slate-500" aria-hidden />
      Settings
      <kbd className="ml-auto rounded border border-white/10 px-1.5 font-mono text-[11px] text-slate-500">
        {comboKeys(shortcuts.openSettings).join('+')}
      </kbd>
    </button>
  );
}
