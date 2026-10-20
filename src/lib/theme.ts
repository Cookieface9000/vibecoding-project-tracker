// Light/dark theme, shared by the header toggle and the keyboard shortcut.

export const THEME_EVENT = 'vt:theme';

export function isDark() {
  return document.documentElement.classList.contains('dark');
}

export function setDark(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
  try {
    localStorage.setItem('vibetracker.theme', dark ? 'dark' : 'light');
  } catch {
    /* storage blocked — theme still applies for this visit */
  }
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: dark }));
}

export function toggleTheme() {
  setDark(!isDark());
}
