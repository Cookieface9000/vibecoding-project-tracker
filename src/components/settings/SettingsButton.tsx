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
      className="flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-[13px] font-medium text-sidebar-fg-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <Settings className="h-4 w-4" aria-hidden />
      Settings
      <kbd className="ml-auto rounded border border-sidebar-line px-1.5 font-mono text-[10px] text-sidebar-fg-muted">
        {comboKeys(shortcuts.openSettings).join('+')}
      </kbd>
    </button>
  );
}
