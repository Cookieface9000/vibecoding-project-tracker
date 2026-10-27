'use client';

import { Bot, ChevronUp, Plug, RotateCcw, SquareTerminal } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { resetDemoAction } from '@/app/connect/actions';
import { btn } from '@/components/ui';
import { useRememberedOpen } from '@/components/useRememberedOpen';

// Shown above the Demo Board: what the board is for, and how its card references
// (DEMO-3) line up with what an AI connection says and does.

const EXAMPLES = ['Show me the DEMO board', "What's blocking DEMO-6?", 'Move DEMO-3 to Review', 'Hand DEMO-1 to Sam Patel'];

export default function DemoBanner() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [open, toggle] = useRememberedOpen('vibetracker.collapse.demo-banner');

  function reset() {
    if (!confirm('Reset the Demo Board? Every change made to it (by you or an AI) is undone.')) return;
    startTransition(async () => {
      const result = await resetDemoAction();
      setMessage(result.ok ? 'Demo Board reset.' : result.error);
    });
  }

  const title = (
    <button
      type="button"
      onClick={toggle}
      aria-expanded={open}
      aria-controls="demo-banner-body"
      className="flex items-center gap-2 text-left text-[14px] font-semibold text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <Bot className="h-4 w-4 text-brand-ink" aria-hidden />
      Demo Board: try the AI connection here
      <ChevronUp className={`h-4 w-4 text-fg-subtle transition-transform duration-150 ${open ? '' : 'rotate-180'}`} aria-hidden />
      <span className="sr-only">{open ? '(hide)' : '(show)'}</span>
    </button>
  );

  if (!open) {
    return (
      <section aria-labelledby="demo-banner-title" className="mb-5 rounded-md border border-brand/40 bg-brand-soft px-4 py-2">
        <h2 id="demo-banner-title">{title}</h2>
      </section>
    );
  }

  return (
    <section aria-labelledby="demo-banner-title" className="mb-5 rounded-md border border-brand/40 bg-brand-soft p-4 text-[13px] leading-6 text-fg-muted">
      <div id="demo-banner-body" className="flex flex-wrap items-start gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1 basis-80">
          <h2 id="demo-banner-title">{title}</h2>
          <p className="mt-1">
            Every card starts with its reference, like <code className="font-mono font-semibold text-brand-ink">DEMO-3</code>. That&apos;s the
            name an AI uses for the task, so what Claude says matches the card you see. Changes an AI makes appear here within about 15
            seconds, and the cards it changed light up.
          </p>
          <p className="mt-2 font-medium text-fg">Things to ask</p>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {EXAMPLES.map((e) => (
              <li key={e} className="rounded border border-line bg-surface px-2 py-0.5 text-[12px] text-fg">
                {e}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/connect" className={btn.primary}>
            <Plug className="h-4 w-4" aria-hidden />
            Connect an AI
          </Link>
          <Link href="/connect#try-it" className={btn.secondary}>
            <SquareTerminal className="h-4 w-4" aria-hidden />
            Try it without an AI
          </Link>
          <button type="button" className={btn.ghost} onClick={reset} disabled={pending}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            {pending ? 'Resetting…' : 'Reset board'}
          </button>
          {message && (
            <span role="status" className="text-[12px] text-fg-subtle">
              {message}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
