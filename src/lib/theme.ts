// Light/dark theme, shared by the header toggle and the keyboard shortcut.
// Saved in localStorage and in a cookie the server reads (app/layout.tsx), so the chosen theme
// renders from the first paint on every page, signed in or out. Signing out leaves it alone.

export const THEME_EVENT = 'vt:theme';
export const THEME_COOKIE = 'vt_theme';

export function isDark() {
  return document.documentElement.classList.contains('dark');
}

export function setDark(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
  try {
    localStorage.setItem('vibetracker.theme', dark ? 'dark' : 'light');
    document.cookie = `${THEME_COOKIE}=${dark ? 'dark' : 'light'}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    /* storage blocked — theme still applies for this visit */
  }
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: dark }));
}

export function toggleTheme() {
  setDark(!isDark());
}
