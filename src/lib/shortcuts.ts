// Rebindable global keyboard shortcuts (Settings → Keyboard shortcuts).

export const SHORTCUT_ACTIONS = [
  { id: 'newTask', label: 'Add a task (on a board)', default: 'n' },
  { id: 'editTask', label: 'Edit a task (on a board)', default: 'e' },
  { id: 'focusBoard', label: 'Jump to the first task on the board', default: 'b' },
  { id: 'newProject', label: 'New project', default: 'c' },
  { id: 'allProjects', label: 'Go to all projects', default: 'g' },
  { id: 'toggleTheme', label: 'Toggle light / dark mode', default: 't' },
  { id: 'openGuide', label: 'Open the guide', default: 'h' },
  { id: 'openSettings', label: 'Open settings', default: ',' },
  { id: 'showShortcuts', label: 'Show keyboard shortcuts', default: '?' },
] as const;

export type ShortcutAction = (typeof SHORTCUT_ACTIONS)[number]['id'];
export type ShortcutMap = Record<ShortcutAction, string>;

export const DEFAULT_SHORTCUTS = Object.fromEntries(SHORTCUT_ACTIONS.map((a) => [a.id, a.default])) as ShortcutMap;

/** Keys that keep their built-in meaning and can't be bound. */
const RESERVED = new Set(['Escape', 'Tab', 'Enter', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock']);

/** "n", "Shift+n", "Ctrl+k", "?" … or null for keys that can't be shortcuts. */
export function comboFromEvent(e: KeyboardEvent | React.KeyboardEvent): string | null {
  if (MODIFIER_KEYS.has(e.key) || RESERVED.has(e.key)) return null;
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  let key = e.key;
  if (key.length === 1) {
    // Letters: Shift is part of the combo. Symbols (?, <, …) already encode Shift.
    if (key.toLowerCase() !== key.toUpperCase()) {
      if (e.shiftKey) parts.push('Shift');
      key = key.toLowerCase();
    }
  } else if (e.shiftKey) {
    parts.push('Shift');
  }
  parts.push(key);
  return parts.join('+');
}

/** Pretty label for display, e.g. "Shift+n" → ["Shift", "N"]. */
export function comboKeys(combo: string): string[] {
  return combo.split('+').map((k) => (k.length === 1 ? k.toUpperCase() : k));
}
