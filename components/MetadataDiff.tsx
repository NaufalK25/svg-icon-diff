'use client';

import { usePixelDiff } from '@/hooks/usePixelDiff';
import { BADGE_DIFF_SIZE } from '@/hooks/usePullRequest';
import { useSvgAnalysis } from '@/hooks/useSvgAnalysis';
import type { PixelDiffResult, SvgItem } from '@/types/diff';
import type { SvgAnalysis } from '@/utils/analyzeSvg';
import { formatBytes } from '@/utils/formatBytes';
import { formatChangedPercent } from '@/utils/pixelDiff';
import { isPassing, MAX_QUALITY_SCORE, QUALITY_CHECKS, type QualityCheck } from '@/utils/qualityChecks';

import LoadingMessage from './LoadingMessage';
import { STATUS_ICONS } from './QualityChecklist';

const BETTER = 'text-success';
const WORSE = 'text-destructive';

/** Values that can be shown as a swatch; url(#gradient) and none can't */
const isSwatchable = (c: string) => !/^(none|currentColor|inherit|transparent)$/i.test(c) && !c.startsWith('url(');

function Swatches({ colors, highlight }: { colors: string[]; highlight: Set<string> }) {
  if (colors.length === 0) return <span className="text-muted-foreground">none</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {colors.map(c => (
        <span
          key={c}
          className={`inline-flex items-center gap-1 rounded-sm border px-1 ${highlight.has(c) ? 'border-foreground font-semibold' : 'border-border'}`}
          title={c}
        >
          {isSwatchable(c) && (
            <span className="inline-block h-3 w-3 rounded-xs border border-border" style={{ backgroundColor: c }} />
          )}
          <span className="font-mono">{c}</span>
        </span>
      ))}
    </span>
  );
}

function Status({ check }: { check: QualityCheck | undefined }) {
  if (!check) return <span className="text-muted-foreground">–</span>;
  const { icon: Icon, color } = STATUS_ICONS[check.status];
  return (
    <span className="inline-flex items-start gap-1.5" title={check.details}>
      <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${color}`} />
      <span className="text-muted-foreground">{check.details}</span>
    </span>
  );
}

function pctDelta(a: number, b: number): { text: string; className: string } {
  if (a === b) return { text: '=', className: 'text-muted-foreground' };
  const pct = a === 0 ? 100 : Math.round(((b - a) / a) * 100);
  return { text: `${pct > 0 ? '+' : pct < 0 ? '−' : '±'}${Math.abs(pct)}%`, className: b < a ? BETTER : WORSE };
}

function countDelta(a: number, b: number): string {
  if (a === b) return '=';
  return `${b > a ? '+' : '−'}${Math.abs(b - a)}`;
}

interface MetadataDiffProps {
  a: SvgItem;
  b: SvgItem;
  labels: [string, string];
}

export default function MetadataDiff({ a, b, labels }: MetadataDiffProps) {
  const ra = useSvgAnalysis(a.content, a.name, a.variant);
  const rb = useSvgAnalysis(b.content, b.name, b.variant);

  const diff = usePixelDiff(a.content, b.content, BADGE_DIFF_SIZE);

  if (!ra || !rb) {
    return <LoadingMessage>Analyzing…</LoadingMessage>;
  }
  return <MetadataTable a={ra} b={rb} diff={diff} labels={labels} />;
}

function MetadataTable({
  a,
  b,
  diff,
  labels,
}: {
  a: SvgAnalysis;
  b: SvgAnalysis;
  diff: PixelDiffResult | null;
  labels: [string, string];
}) {
  const ma = a.metadata;
  const mb = b.metadata;
  const bytes = pctDelta(ma.byteSize, mb.byteSize);
  const colorsA = new Set(ma.colors);
  const colorsB = new Set(mb.colors);
  const addedColors = mb.colors.filter(c => !colorsA.has(c));
  const removedColors = ma.colors.filter(c => !colorsB.has(c));

  const counts: [string, keyof typeof ma][] = [
    ['Paths', 'pathCount'],
    ['Groups', 'groupCount'],
    ['Circles', 'circleCount'],
    ['Rects', 'rectCount'],
    ['Polygons', 'polygonCount'],
    ['<use>', 'useCount'],
  ];
  const shownCounts = counts.filter(([, k]) => ma[k] || mb[k]);

  const size = (m: typeof ma) =>
    m.width !== null || m.height !== null ? `${m.width ?? '?'}×${m.height ?? '?'}` : null;
  const sizeCell = (m: typeof ma) => size(m) ?? <span className="text-muted-foreground">not set</span>;

  const rows: { label: string; a: React.ReactNode; b?: React.ReactNode; delta: React.ReactNode }[] = [
    {
      label: 'Pixel change',
      a: diff ? (
        <span className="text-muted-foreground">
          {diff.changed === 0
            ? `No visual change at ${BADGE_DIFF_SIZE}px: only the code changed`
            : `${diff.changed} of ${diff.total} pixels changed at ${BADGE_DIFF_SIZE}px`}
        </span>
      ) : (
        <span className="text-muted-foreground">…</span>
      ),
      delta: diff ? (
        <span className={diff.changed === 0 ? BETTER : 'text-foreground'}>
          {formatChangedPercent(diff.changed, diff.total)}
        </span>
      ) : (
        '…'
      ),
    },
    {
      label: 'Bytes / gzip',
      a: `${formatBytes(ma.byteSize)} / ${formatBytes(ma.gzipSize)}`,
      b: `${formatBytes(mb.byteSize)} / ${formatBytes(mb.gzipSize)}`,
      delta: <span className={bytes.className}>{bytes.text}</span>,
    },
    {
      label: 'viewBox',
      a: <code>{ma.viewBox ?? 'missing'}</code>,
      b: <code>{mb.viewBox ?? 'missing'}</code>,
      delta: ma.viewBox === mb.viewBox ? '=' : <span className={WORSE}>changed</span>,
    },
    {
      label: 'width × height set',
      a: sizeCell(ma),
      b: sizeCell(mb),
      delta: size(ma) === size(mb) ? '=' : <span className={WORSE}>changed</span>,
    },
    {
      label: 'Lines',
      a: `${ma.lineCount}${ma.hasTrailingNewline ? ' + newline' : ''}`,
      b: `${mb.lineCount}${mb.hasTrailingNewline ? ' + newline' : ''}`,
      delta: countDelta(ma.lineCount, mb.lineCount),
    },
    {
      label: shownCounts.map(([l]) => l).join(' / ') || 'Elements',
      a: shownCounts.map(([, k]) => ma[k]).join(' / ') || '0',
      b: shownCounts.map(([, k]) => mb[k]).join(' / ') || '0',
      delta: shownCounts.map(([, k]) => countDelta(ma[k] as number, mb[k] as number)).join(' / ') || '=',
    },
    {
      label: 'Colors',
      a: <Swatches colors={ma.colors} highlight={new Set(removedColors)} />,
      b: <Swatches colors={mb.colors} highlight={new Set(addedColors)} />,
      delta:
        addedColors.length || removedColors.length ? (
          <span>
            {addedColors.length > 0 && <span className={WORSE}>+{addedColors.length} added </span>}
            {removedColors.length > 0 && <span className={BETTER}>−{removedColors.length} removed</span>}
          </span>
        ) : (
          '='
        ),
    },
    {
      label: 'External references',
      a: a.externalRefs.length ? <span className={WORSE}>{a.externalRefs.join(', ')}</span> : 'none',
      b: b.externalRefs.length ? <span className={WORSE}>{b.externalRefs.join(', ')}</span> : 'none',
      delta:
        b.externalRefs.length > 0 ? (
          <span className={WORSE} title="Not loaded in previews: the icon is shown without them">
            not rendered
          </span>
        ) : (
          '='
        ),
    },
    {
      label: 'Quality score',
      a: `${a.score}/${MAX_QUALITY_SCORE}`,
      b: `${b.score}/${MAX_QUALITY_SCORE}`,
      delta:
        a.score === b.score ? (
          '='
        ) : (
          <span className={b.score > a.score ? BETTER : WORSE}>
            {b.score > a.score ? '+' : '−'}
            {Math.abs(b.score - a.score)}
          </span>
        ),
    },
  ];

  return (
    <div className="overflow-x-auto rounded-md border border-border bg-card">
      <table className="w-full text-[13px]">
        <thead className="border-b border-border bg-well text-left text-xs">
          <tr>
            <th className="w-44 px-3 py-2.5 font-medium" />
            <th className="px-3 py-2.5 font-semibold text-plate-a">{labels[0]}</th>
            <th className="px-3 py-2.5 font-semibold text-plate-b">{labels[1]}</th>
            <th className="w-28 px-3 py-2.5 font-semibold text-muted-foreground">Δ</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map(row => (
            <tr key={row.label} className="border-t border-border align-top first:border-t-0">
              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{row.label}</td>
              {row.b === undefined ? (
                <td colSpan={2} className="px-3 py-2">
                  {row.a}
                </td>
              ) : (
                <>
                  <td className="px-3 py-2">{row.a}</td>
                  <td className="px-3 py-2">{row.b}</td>
                </>
              )}
              <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{row.delta}</td>
            </tr>
          ))}
          <tr className="border-t border-border">
            <th colSpan={4} scope="colgroup" className="px-3 pt-6 pb-2 text-left text-sm font-semibold">
              Quality checks
            </th>
          </tr>
          {QUALITY_CHECKS.map(({ key, name }) => {
            const ca = a.checks.find(c => c.key === key);
            const cb = b.checks.find(c => c.key === key);
            const newlyFailing = isPassing(ca) && !isPassing(cb);
            const fixed = !isPassing(ca) && isPassing(cb);
            return (
              <tr key={key} className={`border-t border-border align-top ${newlyFailing ? 'bg-destructive-soft' : ''}`}>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{name}</td>
                <td className="px-3 py-2">
                  <Status check={ca} />
                </td>
                <td className="px-3 py-2">
                  <Status check={cb} />
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-xs">
                  {newlyFailing ? (
                    <span className={`font-semibold ${WORSE}`}>newly failing</span>
                  ) : fixed ? (
                    <span className={BETTER}>fixed</span>
                  ) : ca?.status === cb?.status ? (
                    <span className="font-mono">=</span>
                  ) : (
                    <span className="text-muted-foreground">
                      {ca?.status} → {cb?.status}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
