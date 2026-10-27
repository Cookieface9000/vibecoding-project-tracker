'use client';

import { Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { runToolAction } from '@/app/connect/actions';
import { btn, field, fieldHint, fieldLabel } from '@/components/ui';
import { TOOL_CATALOG, toolInfo, type ToolField } from '@/lib/mcp/catalog';
import { CONTEXT_TOOLS, STAGES } from '@/lib/types';

// Run any MCP tool from the page, without an AI app. Same code path as an AI connection,
// so the result is exactly what the AI would receive.

type Values = Record<string, string | boolean>;

export default function TryIt({ projectCodes, members, defaultProject }: { projectCodes: string[]; members: string[]; defaultProject: string }) {
  const router = useRouter();
  const [toolName, setToolName] = useState('get_board');
  const [values, setValues] = useState<Values>({ project: defaultProject });
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const tool = toolInfo(toolName)!;

  function set(name: string, value: string | boolean) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  function run(e: React.FormEvent) {
    e.preventDefault();
    const args: Record<string, unknown> = {};
    for (const f of tool.fields) {
      const value = values[f.name];
      if (value === undefined || value === '' || value === false) continue;
      if (f.type === 'number') args[f.name] = Number(value);
      else if (f.type === 'moves') args[f.name] = parseMoves(String(value));
      else args[f.name] = value;
    }
    startTransition(async () => {
      setResult(await runToolAction(tool.name, args));
      router.refresh(); // AI activity list and any changed board
    });
  }

  return (
    <form onSubmit={run} className="space-y-4">
      <label className="block">
        <span className={fieldLabel}>Tool</span>
        <select
          className={field}
          value={toolName}
          onChange={(e) => {
            setToolName(e.target.value);
            setResult(null);
          }}
        >
          <optgroup label="Read">
            {TOOL_CATALOG.filter((t) => !t.write).map((t) => (
              <option key={t.name} value={t.name}>
                {t.title} ({t.name})
              </option>
            ))}
          </optgroup>
          <optgroup label="Change the board">
            {TOOL_CATALOG.filter((t) => t.write).map((t) => (
              <option key={t.name} value={t.name}>
                {t.title} ({t.name})
              </option>
            ))}
          </optgroup>
        </select>
        <p className={fieldHint}>{tool.description}</p>
      </label>

      {tool.fields.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {tool.fields.map((f) => (
            <Field key={f.name} field={f} value={values[f.name]} onChange={(v) => set(f.name, v)} projectCodes={projectCodes} members={members} />
          ))}
        </div>
      )}

      <button type="submit" className={btn.primary} disabled={pending}>
        <Play className="h-4 w-4" aria-hidden />
        {pending ? 'Running…' : `Run ${tool.name}`}
      </button>

      {result && (
        <div aria-live="polite">
          <p className={`mb-1.5 text-[12px] font-medium ${result.ok ? 'text-fg-muted' : 'text-red-700 dark:text-red-400'}`}>
            {result.ok ? 'What the AI receives:' : 'Error returned to the AI:'}
          </p>
          <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-md border border-line bg-muted p-3 font-mono text-[12px] leading-5 text-fg">
            {result.text}
          </pre>
        </div>
      )}
    </form>
  );
}

/** "DEMO-1 review" per line → [{ task: 'DEMO-1', to: 'review' }]. */
function parseMoves(text: string) {
  return text
    .split('\n')
    .map((l) => l.trim().split(/\s+/))
    .filter((parts) => parts[0])
    .map(([task, to]) => ({ task, to }));
}

function Field({
  field: f,
  value,
  onChange,
  projectCodes,
  members,
}: {
  field: ToolField;
  value: string | boolean | undefined;
  onChange: (value: string | boolean) => void;
  projectCodes: string[];
  members: string[];
}) {
  const label = `${f.name}${f.required ? '' : ' (optional)'}`;
  const text = typeof value === 'string' ? value : '';

  if (f.type === 'boolean') {
    return (
      <label className="flex items-start gap-2 self-end pb-1 text-[13px] text-fg">
        <input type="checkbox" className="mt-1 accent-brand" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
        <span>
          <span className="font-medium">{f.name}</span>
          <span className="block text-[12px] text-fg-subtle">{f.help}</span>
        </span>
      </label>
    );
  }

  const options =
    f.type === 'project' ? projectCodes : f.type === 'status' ? STAGES.map((s) => s.id) : f.type === 'member' ? members : f.type === 'ai-tool' ? [...CONTEXT_TOOLS] : null;

  return (
    <label className={f.type === 'longtext' || f.type === 'moves' ? 'sm:col-span-2' : ''}>
      <span className={fieldLabel}>{label}</span>
      {options ? (
        <select className={field} value={text} onChange={(e) => onChange(e.target.value)} required={f.required}>
          <option value="">{f.required ? 'Choose…' : 'Any / none'}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : f.type === 'longtext' || f.type === 'moves' ? (
        <textarea
          className={`${field} min-h-[6rem] font-mono`}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          required={f.required}
          placeholder={f.type === 'moves' ? 'DEMO-1 in-progress\nDEMO-8 done' : undefined}
        />
      ) : (
        <input
          className={field}
          type={f.type === 'number' ? 'number' : 'text'}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          required={f.required}
          placeholder={f.type === 'task' ? 'DEMO-3' : undefined}
        />
      )}
      <p className={fieldHint}>{f.type === 'moves' ? 'One per line: task, then column (todo, in-progress, review, done).' : f.help}</p>
    </label>
  );
}
