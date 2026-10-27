'use client';

import { Plus } from 'lucide-react';
import { useRef, useState, useTransition } from 'react';
import { logPrompt } from '@/app/actions';
import { CONTEXT_TOOLS, type ContextTool } from '@/lib/types';
import { btn, field, fieldLabel } from './ui';

// "Log a prompt" in the task view: paste a prompt you used and pick the AI tool.
// It joins the task's prompt history (newest first) once the board refreshes.
export default function PromptLogger({
  taskId,
  projectId,
  defaultTool,
  onLogged,
}: {
  taskId: string;
  projectId: string;
  defaultTool: ContextTool | null;
  onLogged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [tool, setTool] = useState<ContextTool | ''>(defaultTool ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const textRef = useRef<HTMLTextAreaElement>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setTimeout(() => textRef.current?.focus(), 0);
        }}
        className={`${btn.secondary} mb-3`}
      >
        <Plus className="h-4 w-4" aria-hidden />
        Log a prompt
      </button>
    );
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await logPrompt(taskId, projectId, prompt, tool || null);
      if (!result.ok) return setError(result.error);
      setPrompt('');
      setError(null);
      setOpen(false);
      onLogged();
    });
  }

  return (
    <form onSubmit={save} className="mb-4 rounded-lg border border-line bg-surface p-3">
      <label htmlFor={`log-prompt-${taskId}`} className={fieldLabel}>
        Prompt
      </label>
      <textarea
        id={`log-prompt-${taskId}`}
        ref={textRef}
        value={prompt}
        onChange={(e) => {
          setPrompt(e.target.value);
          setError(null);
        }}
        maxLength={20000}
        required
        placeholder="Paste the prompt you gave the AI…"
        className={`${field} min-h-[6rem] font-mono text-xs leading-5`}
        aria-describedby={error ? `log-prompt-error-${taskId}` : undefined}
      />
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="w-44">
          <span className={fieldLabel}>AI tool</span>
          <select value={tool} onChange={(e) => setTool(e.target.value as ContextTool | '')} className={field}>
            <option value="">Not specified</option>
            {CONTEXT_TOOLS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={() => setOpen(false)} className={btn.ghost}>
            Cancel
          </button>
          <button type="submit" disabled={pending || !prompt.trim()} className={btn.primary}>
            {pending ? 'Saving…' : 'Save prompt'}
          </button>
        </div>
      </div>
      {error && (
        <p id={`log-prompt-error-${taskId}`} role="alert" className="mt-2 text-[13px] text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
    </form>
  );
}
