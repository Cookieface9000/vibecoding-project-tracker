'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { THEME_EVENT, isDark, toggleTheme } from '@/lib/theme';

export default function ThemeToggle() {
  // null until mounted: the real theme is only known in the browser.
  const [dark, setDarkState] = useState<boolean | null>(null);

  useEffect(() => {
    setDarkState(isDark());
    // Stay in sync when the theme changes elsewhere (e.g. the keyboard shortcut).
    const sync = () => setDarkState(isDark());
    window.addEventListener(THEME_EVENT, sync);
    return () => window.removeEventListener(THEME_EVENT, sync);
  }, []);

  const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus-visible:ring-brand-dark"
    >
      {dark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-brand" />}
      <span className="hidden sm:inline">{dark ? 'Light' : 'Dark'}</span>
    </button>
  );
}
