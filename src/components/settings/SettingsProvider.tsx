'use client';

import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DEFAULT_SHORTCUTS, comboFromEvent, type ShortcutAction, type ShortcutMap } from '@/lib/shortcuts';
import { toggleTheme } from '@/lib/theme';
import SettingsModal, { type SettingsTab } from './SettingsModal';

export type ColorVision = 'none' | 'redgreen' | 'blueyellow' | 'mono';
export interface Prefs {
  colorVision: ColorVision;
  reduceMotion: boolean;
}

const DEFAULT_PREFS: Prefs = { colorVision: 'none', reduceMotion: false };
const PREFS_KEY = 'vibetracker.prefs';
const SHORTCUTS_KEY = 'vibetracker.shortcuts';

interface SettingsContextValue {
  prefs: Prefs;
  setPrefs: (next: Partial<Prefs>) => void;
  shortcuts: ShortcutMap;
  setShortcut: (action: ShortcutAction, combo: string) => void;
  resetShortcuts: () => void;
  openSettings: (tab?: SettingsTab) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked — setting applies for this visit only */
  }
}

/** Apply accessibility prefs to <html> so the whole app (and dialogs) follow them. */
function applyPrefs(prefs: Prefs) {
  const root = document.documentElement;
  if (prefs.colorVision === 'none') root.removeAttribute('data-cvd');
  else root.setAttribute('data-cvd', prefs.colorVision);
  if (prefs.reduceMotion) root.setAttribute('data-motion', 'reduce');
  else root.removeAttribute('data-motion');
}

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
}

export default function SettingsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS);
  const [shortcuts, setShortcuts] = useState<ShortcutMap>(DEFAULT_SHORTCUTS);
  const [openTab, setOpenTab] = useState<SettingsTab | null>(null);

  // Load saved settings once in the browser. (The inline script in layout.tsx already
  // applied them before first paint, so there's no flash.)
  useEffect(() => {
    const p = load(PREFS_KEY, DEFAULT_PREFS);
    setPrefsState(p);
    applyPrefs(p);
    setShortcuts(load(SHORTCUTS_KEY, DEFAULT_SHORTCUTS));
  }, []);

  const setPrefs = useCallback((next: Partial<Prefs>) => {
    setPrefsState((current) => {
      const merged = { ...current, ...next };
      applyPrefs(merged);
      save(PREFS_KEY, merged);
      return merged;
    });
  }, []);

  const setShortcut = useCallback((action: ShortcutAction, combo: string) => {
    setShortcuts((current) => {
      const merged = { ...current, [action]: combo };
      save(SHORTCUTS_KEY, merged);
      return merged;
    });
  }, []);

  const resetShortcuts = useCallback(() => {
    setShortcuts(DEFAULT_SHORTCUTS);
    save(SHORTCUTS_KEY, DEFAULT_SHORTCUTS);
  }, []);

  const openSettings = useCallback((tab: SettingsTab = 'profile') => setOpenTab(tab), []);

  // Global shortcuts. Ignored while typing or while any dialog is open.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented || isTyping(e.target) || document.querySelector('dialog[open]')) return;
      const combo = comboFromEvent(e);
      if (!combo) return;
      const action = (Object.keys(shortcuts) as ShortcutAction[]).find((a) => shortcuts[a] === combo);
      if (!action) return;
      e.preventDefault();
      switch (action) {
        case 'newTask':
          window.dispatchEvent(new CustomEvent('vt:new-task'));
          break;
        case 'editTask':
          window.dispatchEvent(new CustomEvent('vt:edit-task'));
          break;
        case 'focusBoard':
          document.querySelector<HTMLElement>('[data-task-card]')?.focus();
          break;
        case 'newProject':
          router.push('/projects/new');
          break;
        case 'allProjects':
          router.push('/');
          break;
        case 'openGuide':
          router.push('/guide');
          break;
        case 'toggleTheme':
          toggleTheme();
          break;
        case 'openSettings':
          setOpenTab('profile');
          break;
        case 'showShortcuts':
          setOpenTab('shortcuts');
          break;
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shortcuts, router]);

  return (
    <SettingsContext.Provider value={{ prefs, setPrefs, shortcuts, setShortcut, resetShortcuts, openSettings }}>
      {children}
      {openTab && <SettingsModal initialTab={openTab} onClose={() => setOpenTab(null)} />}
    </SettingsContext.Provider>
  );
}
