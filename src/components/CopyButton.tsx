'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

// Copies `getText()` and confirms with "Copied" (announced to screen readers).
export default function CopyButton({
  getText,
  label = 'Copy context',
  className = '',
}: {
  getText: () => string;
  label?: string;
  className?: string;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function copy() {
    const text = getText();
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      // Fallback for browsers/contexts that block the async clipboard API.
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      setState(ok ? 'copied' : 'failed');
    }
    setTimeout(() => setState('idle'), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-fg-muted shadow-sm hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${className}`}
    >
      {state === 'copied' ? <Check className="h-3.5 w-3.5 text-brand-ink" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      <span aria-live="polite">{state === 'copied' ? 'Copied — paste it into your AI' : state === 'failed' ? 'Copy failed' : label}</span>
    </button>
  );
}
