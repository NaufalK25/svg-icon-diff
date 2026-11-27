'use client';

import { useMemo, useState } from 'react';

import { ChevronsUpDown } from 'lucide-react';

import { formatSvg } from '@/utils/formatSvg';
import { highlightLines, HLJS_COLORS } from '@/utils/highlight';
import { type DiffLine, diffText, markRanges } from '@/utils/textDiff';

import { toggleClass } from './CompareToolbar';
import { EMPTY_STATE, SEGMENT_GROUP, toggleButtonClass } from './ui';

// Unchanged lines kept around each change; longer unchanged runs fold away
const CONTEXT = 3;
const MIN_FOLD = 4;

const LINE_BG: Record<DiffLine['type'], string> = {
  context: '',
  added: 'bg-code-added',
  removed: 'bg-code-removed',
};
const SIGN: Record<DiffLine['type'], string> = { context: ' ', added: '+', removed: '−' };
const SIGN_COLOR: Record<DiffLine['type'], string> = {
  context: 'text-muted-foreground',
  added: 'text-success',
  removed: 'text-destructive',
};
const MARK_CLASS: Record<'added' | 'removed', string> = {
  added: 'rounded-[2px] bg-code-added-strong text-inherit',
  removed: 'rounded-[2px] bg-code-removed-strong text-inherit',
};

interface Fold {
  fold: true;
  start: number;
  count: number;
}

/** Replace long runs of unchanged rows with a fold marker, keeping CONTEXT rows next to each change */
function foldContext<T>(rows: T[], isContext: (row: T) => boolean, expanded: Set<number>): (T | Fold)[] {
  const out: (T | Fold)[] = [];
  let i = 0;
  while (i < rows.length) {
    if (!isContext(rows[i])) {
      out.push(rows[i++]);
      continue;
    }
    let j = i;
    while (j < rows.length && isContext(rows[j])) j++;
    const lead = i === 0 ? 0 : CONTEXT;
    const trail = j === rows.length ? 0 : CONTEXT;
    const hidden = j - i - lead - trail;
    if (hidden >= MIN_FOLD && !expanded.has(i)) {
      out.push(...rows.slice(i, i + lead), { fold: true, start: i, count: hidden }, ...rows.slice(j - trail, j));
    } else {
      out.push(...rows.slice(i, j));
    }
    i = j;
  }
  return out;
}

const isFold = (row: unknown): row is Fold => typeof row === 'object' && row !== null && 'fold' in row;

interface CodeDiffProps {
  a: string;
  b: string;
  labels: [string, string];
}

export default function CodeDiff({ a, b, labels }: CodeDiffProps) {
  const [normalize, setNormalize] = useState(true);
  const [view, setView] = useState<'unified' | 'split'>('unified');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const textA = useMemo(() => (normalize ? formatSvg(a) : a), [a, normalize]);
  const textB = useMemo(() => (normalize ? formatSvg(b) : b), [b, normalize]);
  const diff = useMemo(() => diffText(textA, textB), [textA, textB]);
  const htmlA = useMemo(() => highlightLines(textA), [textA]);
  const htmlB = useMemo(() => highlightLines(textB), [textB]);
  const rawEqual = a.replace(/\r\n?/g, '\n') === b.replace(/\r\n?/g, '\n');

  const lineHtml = (line: DiffLine) => {
    const html = (line.type === 'added' ? htmlB[line.newNo! - 1] : htmlA[line.oldNo! - 1]) ?? '';
    return line.type === 'context' ? html : markRanges(html, line.ranges, MARK_CLASS[line.type]);
  };

  const expand = (start: number) => setExpanded(prev => new Set(prev).add(start));

  const foldRow = (row: Fold, colSpan: number) => (
    <tr key={`fold-${row.start}`} className="border-y border-border bg-well">
      <td colSpan={colSpan} className="px-2 py-0.5">
        <button
          onClick={() => expand(row.start)}
          className="inline-flex h-6 items-center gap-1.5 rounded-sm px-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronsUpDown className="h-3 w-3" />
          {row.count} unchanged lines
        </button>
      </td>
    </tr>
  );

  const numCell = (n?: number) => (
    <td className="w-10 select-none border-r border-border px-2 text-right align-top text-muted-foreground">
      {n ?? ''}
    </td>
  );

  const codeCell = (line?: DiffLine) =>
    line ? (
      <>
        <td className={`w-4 select-none pl-2 align-top ${SIGN_COLOR[line.type]} ${LINE_BG[line.type]}`}>
          {SIGN[line.type]}
        </td>
        <td
          className={`whitespace-pre-wrap break-all pr-3 align-top ${LINE_BG[line.type]}`}
          dangerouslySetInnerHTML={{ __html: lineHtml(line) }}
        />
      </>
    ) : (
      <td colSpan={2} className="bg-well" />
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div className={SEGMENT_GROUP} role="group" aria-label="Diff layout">
          <button
            onClick={() => setView('unified')}
            aria-pressed={view === 'unified'}
            className={toggleClass(view === 'unified')}
          >
            Unified
          </button>
          <button
            onClick={() => setView('split')}
            aria-pressed={view === 'split'}
            className={toggleClass(view === 'split')}
          >
            Split
          </button>
        </div>
        <button
          onClick={() => setNormalize(v => !v)}
          aria-pressed={normalize}
          className={toggleButtonClass(normalize)}
          title="Pretty-print both files (one element per line) before diffing, so formatting alone doesn't show as a rewrite"
        >
          Normalize
        </button>
        <span className="ml-auto flex gap-3 font-mono text-sm font-semibold tabular-nums">
          <span className="text-success">+{diff.added}</span>
          <span className="text-destructive">−{diff.removed}</span>
        </span>
      </div>

      {diff.added === 0 && diff.removed === 0 ? (
        <p className={EMPTY_STATE}>
          {rawEqual
            ? 'The files are identical.'
            : 'Only formatting differs. Turn off Normalize to see the raw changes.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <table className={`hljs language-xml w-full border-collapse font-mono text-xs leading-5 ${HLJS_COLORS}`}>
            {view === 'split' && (
              <thead className="border-b border-border bg-well text-left">
                <tr>
                  <th
                    colSpan={3}
                    className="w-1/2 border-r border-border px-2 py-1.5 font-sans font-semibold text-plate-a"
                  >
                    {labels[0]}
                  </th>
                  <th colSpan={3} className="px-2 py-1.5 font-sans font-semibold text-plate-b">
                    {labels[1]}
                  </th>
                </tr>
              </thead>
            )}
            <tbody>
              {view === 'unified'
                ? foldContext(diff.lines, l => l.type === 'context', expanded).map((row, i) =>
                  isFold(row) ? (
                    foldRow(row, 4)
                  ) : (
                    <tr key={i}>
                      {numCell(row.oldNo)}
                      {numCell(row.newNo)}
                      {codeCell(row)}
                    </tr>
                  ),
                )
                : foldContext(diff.rows, r => r.left?.type === 'context', expanded).map((row, i) =>
                  isFold(row) ? (
                    foldRow(row, 6)
                  ) : (
                    <tr key={i}>
                      {numCell(row.left?.oldNo)}
                      {codeCell(row.left)}
                      {numCell(row.right?.newNo)}
                      {codeCell(row.right)}
                    </tr>
                  ),
                )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
