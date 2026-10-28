import ReactMarkdown, { type Components } from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

// Context is stored as Markdown. This renders it for reading (task view, outcomes, Total context);
// only the Edit form shows the raw text. Raw HTML in the text is ignored, and react-markdown
// drops unsafe link targets (e.g. javascript:), so stored context can't inject anything.

const components: Components = {
  h1: ({ children }) => <h3 className="mb-1.5 mt-4 text-[15px] font-semibold text-fg first:mt-0">{children}</h3>,
  h2: ({ children }) => <h4 className="mb-1.5 mt-4 text-[14px] font-semibold text-fg first:mt-0">{children}</h4>,
  h3: ({ children }) => <h5 className="mb-1 mt-3 text-[13px] font-semibold text-fg first:mt-0">{children}</h5>,
  h4: ({ children }) => <h6 className="mb-1 mt-3 text-[13px] font-semibold text-fg-muted first:mt-0">{children}</h6>,
  p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-fg">{children}</strong>,
  ul: ({ children }) => <ul className="my-1.5 list-disc space-y-0.5 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-1.5 list-decimal space-y-0.5 pl-5">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  // Unsafe targets arrive here emptied; show those as plain text rather than a dead link.
  a: ({ href, children }) =>
    href ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-ink underline underline-offset-2">
        {children}
      </a>
    ) : (
      <span>{children}</span>
    ),
  blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-line-strong pl-3 text-fg-subtle">{children}</blockquote>,
  hr: () => <hr className="my-3 border-line" />,
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-md border border-line bg-surface p-2.5 font-mono text-[12px] leading-5 text-fg">{children}</pre>
  ),
  code: ({ className, children }) =>
    className ? (
      <code className={className}>{children}</code> // inside a fenced block (styled by pre)
    ) : (
      <code className="rounded bg-surface px-1 py-0.5 font-mono text-[12px] text-fg">{children}</code>
    ),
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-line bg-surface px-2 py-1 text-left font-semibold text-fg">{children}</th>,
  td: ({ children }) => <td className="border border-line px-2 py-1">{children}</td>,
  input: ({ checked }) => <input type="checkbox" checked={checked} disabled className="mr-1.5 accent-brand" aria-label={checked ? 'Done' : 'Not done'} />,
};

export default function Markdown({ children, className = '' }: { children: string; className?: string }) {
  return (
    <div className={`text-[13px] leading-6 text-fg-muted ${className}`}>
      {/* remark-breaks keeps single line breaks, so "**Background**" stays on its own line as typed. */}
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
