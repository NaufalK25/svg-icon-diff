'use client';

import { useMemo, useState } from 'react';

import { Check, Copy } from 'lucide-react';

import { highlightLines, HLJS_COLORS } from '@/utils/highlight';

interface CodeViewProps {
  content: string;
}

/** Syntax-highlighted source with line numbers */
export default function CodeView({ content }: CodeViewProps) {
  const lines = useMemo(() => highlightLines(content), [content]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative overflow-hidden rounded-md border border-border bg-well">
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-card text-muted-foreground transition-colors hover:border-input hover:text-foreground"
        title="Copy source"
        aria-label={copied ? 'Copied' : 'Copy source'}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <pre className="max-h-96 overflow-auto p-3 pr-12 font-mono text-xs leading-5">
        <code className={`hljs language-xml block ${HLJS_COLORS}`}>
          {lines.map((line, i) => (
            <div key={i} className="flex">
              <span
                className="shrink-0 select-none pr-3 text-right text-muted-foreground"
                style={{ width: `${String(lines.length).length + 2}ch` }}
              >
                {i + 1}
              </span>
              <span className="whitespace-pre-wrap break-all" dangerouslySetInnerHTML={{ __html: line }} />
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}
