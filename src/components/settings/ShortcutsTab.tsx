'use client';

import { RotateCcw } from 'lucide-react';
import { Fragment, useState } from 'react';
import { SHORTCUT_ACTIONS, comboFromEvent, comboKeys, type ShortcutAction } from '@/lib/shortcuts';
import { btn } from '../Modal';
import { useSettings } from './SettingsProvider';
import { Kbd, PanelTitle } from './ui';

// Fixed keys that aren't rebindable (board and dialogs).
const BUILT_IN: { keys: string[][]; label: string }[] = [
  { keys: [['Tab'], ['Shift', 'Tab']], label: 'Move between controls' },
  { keys: [['Enter']], label: 'Open the focused task' },
  { keys: [['Space']], label: 'Pick up / drop the focused task' },
  { keys: [['←'], ['→']], label: 'While holding a task: move it to the previous / next column' },
  { keys: [['Esc']], label: 'Cancel a move, or close a dialog' },
];

function Combo({ combo }: { combo: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {comboKeys(combo).map((k, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="text-xs text-fg-subtle">+</span>}
          <Kbd>{k}</Kbd>
        </Fragment>
      ))}
    </span>
  );
}

export default function ShortcutsTab() {
  const { shortcuts, setShortcut, resetShortcuts } = useSettings();
  const [recording, setRecording] = useState<ShortcutAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function record(action: ShortcutAction, e: React.KeyboardEvent) {
    e.preventDefault();
    e.stopPropagation(); // don't let Esc close the Settings dialog
    if (e.key === 'Escape') {
      setRecording(null);
      setMessage('Change cancelled.');
      return;
    }
    const combo = comboFromEvent(e);
    if (!combo) return; // modifier on its own, or a reserved key: keep listening
    const clash = SHORTCUT_ACTIONS.find((a) => a.id !== action && shortcuts[a.id] === combo);
    if (clash) {
      setMessage(`${comboKeys(combo).join('+')} is already used for “${clash.label}”. Try another key.`);
      return;
    }
    setShortcut(action, combo);
    setRecording(null);
    setMessage(`Saved: ${comboKeys(combo).join('+')}.`);
  }

  return (
    <div>
      <PanelTitle
        title="Keyboard shortcuts"
        description="Single-key shortcuts work anywhere except while typing in a field or when a dialog is open."
      />

      <table className="w-full text-sm">
        <caption className="sr-only">Customisable shortcuts</caption>
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-fg-subtle">
            <th scope="col" className="pb-2 font-medium">
              Action
            </th>
            <th scope="col" className="pb-2 font-medium">
              Shortcut
            </th>
            <th scope="col" className="pb-2">
              <span className="sr-only">Change</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {SHORTCUT_ACTIONS.map((action) => {
            const isRecording = recording === action.id;
            return (
              <tr key={action.id} className="border-b border-line last:border-0">
                <td className="py-2.5 pr-3 text-fg-muted">{action.label}</td>
                <td className="py-2.5 pr-3">
                  {isRecording ? (
                    <span className="text-xs font-medium text-brand-ink">Press a key…</span>
                  ) : (
                    <Combo combo={shortcuts[action.id]} />
                  )}
                </td>
                <td className="py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setRecording(isRecording ? null : action.id);
                      setMessage(isRecording ? null : `Press the new key for “${action.label}”, or Esc to cancel.`);
                    }}
                    onKeyDown={(e) => {
                      if (isRecording) record(action.id, e);
                    }}
                    onBlur={() => isRecording && setRecording(null)}
                    aria-label={isRecording ? `Recording new key for ${action.label}` : `Change shortcut for ${action.label}`}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      isRecording
                        ? 'bg-brand text-brand-fg'
                        : 'border border-line text-fg-muted hover:bg-hover'
                    }`}
                  >
                    {isRecording ? 'Listening…' : 'Change'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-3 flex min-h-[2rem] flex-wrap items-center justify-between gap-3">
        <p role="status" aria-live="polite" className="text-sm text-fg-muted">
          {message}
        </p>
        <button
          type="button"
          onClick={() => {
            resetShortcuts();
            setMessage('Shortcuts reset to defaults.');
          }}
          className={btn.secondary}
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Reset to defaults
        </button>
      </div>

      <h4 className="mb-2 mt-8 font-medium text-fg">Built-in keys</h4>
      <ul className="space-y-2 text-sm">
        {BUILT_IN.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-3 text-fg-muted">
            <span>{row.label}</span>
            <span className="flex shrink-0 items-center gap-2">
              {row.keys.map((combo, i) => (
                <Fragment key={i}>
                  {i > 0 && <span className="text-xs text-fg-subtle">or</span>}
                  <span className="inline-flex items-center gap-1">
                    {combo.map((k, j) => (
                      <Fragment key={j}>
                        {j > 0 && <span className="text-xs text-fg-subtle">+</span>}
                        <Kbd>{k}</Kbd>
                      </Fragment>
                    ))}
                  </span>
                </Fragment>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
