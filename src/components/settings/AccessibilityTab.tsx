'use client';

import { useSettings, type ColorVision } from './SettingsProvider';
import { PanelTitle } from './ui';

// Swatches: on track · due soon · overdue · feature · bug, as each mode shows them.
const MODES: { id: ColorVision; label: string; description: string; swatches: string[] }[] = [
  {
    id: 'none',
    label: 'Default colours',
    description: 'Green, amber and red, like a traffic light.',
    swatches: ['#16A34A', '#F59E0B', '#DC2626', '#4F46E5', '#DC2626'],
  },
  {
    id: 'redgreen',
    label: 'Red–green safe',
    description: 'For protanopia and deuteranopia. Uses blue, yellow and vermillion.',
    swatches: ['#0072B2', '#E69F00', '#D55E00', '#CC79A7', '#D55E00'],
  },
  {
    id: 'blueyellow',
    label: 'Blue–yellow safe',
    description: 'For tritanopia. Uses green, magenta and dark red.',
    swatches: ['#008C5A', '#DC267F', '#960000', '#008C5A', '#960000'],
  },
  {
    id: 'mono',
    label: 'Monochrome',
    description: 'No colour anywhere. Icons and text carry every meaning.',
    swatches: ['#6B7280', '#A3A3A3', '#3F3F46', '#52525B', '#3F3F46'],
  },
];

const SWATCH_NAMES = ['On track', 'Due soon', 'Overdue', 'Feature', 'Bug'];

export default function AccessibilityTab() {
  const { prefs, setPrefs } = useSettings();

  return (
    <div>
      <PanelTitle
        title="Accessibility"
        description="These settings change the whole app and are remembered on this device."
      />

      <fieldset>
        <legend className="font-medium text-slate-900 dark:text-white">Colour vision</legend>
        <p className="mb-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
          Re-colours urgency, task types and stages. Every colour also has an icon and text, so nothing depends on colour alone.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {MODES.map((mode) => {
            const selected = prefs.colorVision === mode.id;
            return (
              <label
                key={mode.id}
                className={`flex cursor-pointer flex-col gap-2 rounded-lg border p-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/50 ${
                  selected
                    ? 'border-brand bg-brand/5 dark:border-brand-dark dark:bg-brand-dark/10'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60'
                }`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="color-vision"
                    value={mode.id}
                    checked={selected}
                    onChange={() => setPrefs({ colorVision: mode.id })}
                    className="h-4 w-4 accent-brand"
                  />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{mode.label}</span>
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{mode.description}</span>
                <span className="flex gap-1" aria-hidden>
                  {mode.swatches.map((c, i) => (
                    <span key={i} title={SWATCH_NAMES[i]} className="h-4 flex-1 rounded" style={{ backgroundColor: c }} />
                  ))}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-8 flex items-start justify-between gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
        <div>
          <p id="reduce-motion-label" className="font-medium text-slate-900 dark:text-white">
            Reduce motion
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Turns off hover lifts, fades and other animations.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={prefs.reduceMotion}
          aria-labelledby="reduce-motion-label"
          onClick={() => setPrefs({ reduceMotion: !prefs.reduceMotion })}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 ${
            prefs.reduceMotion ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-600'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${prefs.reduceMotion ? 'translate-x-5' : 'translate-x-0.5'}`}
          />
        </button>
      </div>

      <div className="mt-8 rounded-lg bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800/40 dark:text-slate-300">
        <p className="font-medium text-slate-900 dark:text-white">Screen reader and keyboard support</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Every control works with the keyboard; a visible focus ring shows where you are.</li>
          <li>Tasks announce their title, and whether they have AI context, when focused.</li>
          <li>Moving tasks with the keyboard is announced step by step.</li>
          <li>Global shortcuts can be changed in Keyboard shortcuts.</li>
        </ul>
      </div>
    </div>
  );
}
