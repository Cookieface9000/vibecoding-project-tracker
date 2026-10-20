'use client';

import { Accessibility, Keyboard, PlusCircle, User, Users } from 'lucide-react';
import { useRef, useState } from 'react';
import Modal, { ModalHeader } from '../Modal';
import AccessibilityTab from './AccessibilityTab';
import ProfileTab from './ProfileTab';
import ShortcutsTab from './ShortcutsTab';
import { CreateTeamTab, TeamsTab } from './TeamsTabs';

export type SettingsTab = 'profile' | 'teams' | 'create-team' | 'accessibility' | 'shortcuts';

const TABS: { id: SettingsTab; label: string; Icon: typeof User }[] = [
  { id: 'profile', label: 'Profile', Icon: User },
  { id: 'teams', label: 'Teams', Icon: Users },
  { id: 'create-team', label: 'Create team', Icon: PlusCircle },
  { id: 'accessibility', label: 'Accessibility', Icon: Accessibility },
  { id: 'shortcuts', label: 'Keyboard shortcuts', Icon: Keyboard },
];


export default function SettingsModal({ initialTab, onClose }: { initialTab: SettingsTab; onClose: () => void }) {
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Arrow keys move between tabs (WAI-ARIA tabs pattern, vertical).
  function onTabKeyDown(e: React.KeyboardEvent, index: number) {
    const delta = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    const jump = e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : null;
    if (!delta && jump === null) return;
    e.preventDefault();
    const next = jump ?? (index + delta + TABS.length) % TABS.length;
    setTab(TABS[next].id);
    tabRefs.current[TABS[next].id]?.focus();
  }

  return (
    <Modal labelledBy="settings-title" onClose={onClose} size="lg">
      <ModalHeader id="settings-title" title="Settings" onClose={onClose} />
      <div className="flex min-h-0 flex-col sm:h-[min(36rem,75vh)] sm:flex-row">
        <div
          role="tablist"
          aria-orientation="vertical"
          aria-label="Settings sections"
          className="flex shrink-0 gap-1 overflow-x-auto border-b border-line p-2 sm:w-52 sm:flex-col sm:border-b-0 sm:border-r"
        >
          {TABS.map((t, i) => {
            const selected = t.id === tab;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[t.id] = el;
                }}
                role="tab"
                id={`settings-tab-${t.id}`}
                aria-selected={selected}
                aria-controls={`settings-panel-${t.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setTab(t.id)}
                onKeyDown={(e) => onTabKeyDown(e, i)}
                className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                  selected
                    ? 'bg-brand-soft font-medium text-brand-ink'
                    : 'text-fg-muted hover:bg-hover'
                }`}
              >
                <t.Icon className="h-4 w-4 shrink-0" aria-hidden />
                {t.label}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`settings-panel-${tab}`}
          aria-labelledby={`settings-tab-${tab}`}
          tabIndex={0}
          className="min-h-0 flex-1 overflow-y-auto p-6 focus-visible:outline-none"
        >
          {tab === 'profile' && <ProfileTab />}
          {tab === 'teams' && <TeamsTab />}
          {tab === 'create-team' && <CreateTeamTab onViewTeams={() => setTab('teams')} />}
          {tab === 'accessibility' && <AccessibilityTab />}
          {tab === 'shortcuts' && <ShortcutsTab />}
        </div>
      </div>
    </Modal>
  );
}
