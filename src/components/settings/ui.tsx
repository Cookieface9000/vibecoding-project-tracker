// Small shared pieces for the settings panels.

import { field, fieldLabel } from '../Modal';

export const settingsField = field;
export const settingsLabel = fieldLabel;

export function PanelTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5">
      <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">{title}</h3>
      {description && <p className="mt-1 text-[13px] text-fg-subtle">{description}</p>}
    </div>
  );
}

export function PlaceholderNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-5 rounded-lg border border-dashed border-line-strong bg-muted px-3 py-2 text-xs text-fg-subtle">
      {children}
    </p>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[1.75rem] items-center justify-center rounded-md border border-b-2 border-line-strong bg-surface px-1.5 py-0.5 font-mono text-xs text-fg-muted">
      {children}
    </kbd>
  );
}
