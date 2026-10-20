'use client';

import { Fragment } from 'react';
import { SHORTCUT_ACTIONS, comboKeys } from '@/lib/shortcuts';
import { useSettings } from '../settings/SettingsProvider';
import { Kbd } from '../settings/ui';

// Live list: shows the user's current bindings (they can be changed in Settings).
export default function ShortcutList() {
  const { shortcuts, openSettings } = useSettings();

  return (
    <div>
      <table className="w-full border border-line text-[13px]">
        <caption className="sr-only">Keyboard shortcuts</caption>
        <thead className="bg-muted text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
          <tr>
            <th scope="col" className="px-3 py-2 font-semibold">
              Action
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Key
            </th>
          </tr>
        </thead>
        <tbody>
          {SHORTCUT_ACTIONS.map((a) => (
            <tr key={a.id} className="border-t border-line">
              <td className="px-3 py-2 text-fg-muted">{a.label}</td>
              <td className="px-3 py-2">
                <span className="inline-flex items-center gap-1">
                  {comboKeys(shortcuts[a.id]).map((k, i) => (
                    <Fragment key={i}>
                      {i > 0 && <span className="text-[11px] text-fg-subtle">+</span>}
                      <Kbd>{k}</Kbd>
                    </Fragment>
                  ))}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={() => openSettings('shortcuts')}
        className="mt-3 text-[13px] font-medium text-brand-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        Change shortcuts in Settings →
      </button>
    </div>
  );
}
