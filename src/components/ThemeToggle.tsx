'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { THEME_EVENT, isDark, toggleTheme } from '@/lib/theme';

// Icon-only theme switch for the top bar.
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
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-fg-subtle hover:bg-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      {dark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
    </button>
  );
}
