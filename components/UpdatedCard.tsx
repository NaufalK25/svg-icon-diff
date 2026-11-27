'use client';

import { useEffect } from 'react';

import { ArrowRight, LoaderCircle, RotateCw } from 'lucide-react';

import { useInView } from '@/hooks/useInView';
import { useSvgAnalysis } from '@/hooks/useSvgAnalysis';
import type { PrSvgChange } from '@/types/diff';
import { getFilenameFromPath } from '@/utils/analyzeSvg';
import { formatBytes } from '@/utils/formatBytes';
import { formatChangedPercent } from '@/utils/pixelDiff';
import { isPassing } from '@/utils/qualityChecks';

import { CARD_CLASS, RETRY_CLASS } from './AddedCard';
import { svgDataUrl, THEME_PREVIEW_BG } from './GridPreview';

/** Byte delta as "−120 B" / "+1.2 KB" / "±0 B" */
export function formatByteDelta(delta: number): string {
  const abs = Math.abs(delta);
  const value = abs < 1024 ? `${abs} B` : `${(abs / 1024).toFixed(1)} KB`;
  return `${delta > 0 ? '+' : delta < 0 ? '−' : '±'}${value}`;
}

export const byteSize = (content: string) => new Blob([content]).size;

interface UpdatedCardProps {
  change: Extract<PrSvgChange, { kind: 'updated' }>;
  thumbSize: number;
  error?: string;
  onVisible: () => void;
  onRetry: () => void;
  onOpen: () => void;
}

export default function UpdatedCard({ change, thumbSize, error, onVisible, onRetry, onOpen }: UpdatedCardProps) {
  const { ref, inView } = useInView<HTMLButtonElement>();
  const name = getFilenameFromPath(change.path);
  const before = useSvgAnalysis(change.before, getFilenameFromPath(change.previousPath ?? change.path));
  const after = useSvgAnalysis(change.after, name);

  useEffect(() => {
    if (inView) onVisible();
  }, [inView, onVisible]);

  const newlyFailing =
    before && after
      ? after.checks.filter(c => !isPassing(c) && isPassing(before.checks.find(b => b.key === c.key)))
      : [];
  const delta =
    change.before !== null && change.after !== null ? byteSize(change.after) - byteSize(change.before) : null;
  const box = Math.max(thumbSize, 32) + 24;

  const thumb = (content: string | null, alt: string) => (
    <div
      className={`flex items-center justify-center rounded-sm border border-border ${THEME_PREVIEW_BG}`}
      style={{ width: box, height: box }}
    >
      {content ? (
        <img src={svgDataUrl(content)} alt={alt} width={thumbSize} height={thumbSize} />
      ) : error ? null : (
        <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />
      )}
    </div>
  );

  return (
    <button ref={ref} onClick={onOpen} className={CARD_CLASS} title={change.path}>
      <div className="flex items-center justify-center gap-1.5">
        {thumb(change.before, 'Before')}
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        {thumb(change.after, 'After')}
      </div>
      <div className="min-w-0 space-y-1">
        <p className="truncate font-mono text-xs">
          {change.previousPath && (
            <span className="text-muted-foreground">{getFilenameFromPath(change.previousPath)} → </span>
          )}
          {name}
        </p>
        {error ? (
          <p className="flex items-center gap-1.5 text-xs text-destructive">
            <span className="truncate" title={error}>
              {error}
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={e => {
                e.stopPropagation();
                onRetry();
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onRetry();
                }
              }}
              className={RETRY_CLASS}
              title="Try again"
              aria-label="Try again"
            >
              <RotateCw className="h-3 w-3" />
            </span>
          </p>
        ) : (
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-xs tabular-nums">
            {change.diff ? (
              <span
                className={`text-sm font-semibold ${change.diff.changed === 0 ? 'text-success' : 'text-foreground'}`}
                title={
                  change.diff.changed === 0
                    ? 'No visual change at 32px: only the code changed'
                    : `${change.diff.changed} of ${change.diff.total} pixels changed at 32px`
                }
              >
                {change.diff.changed === 0
                  ? '0% visual change'
                  : formatChangedPercent(change.diff.changed, change.diff.total)}
              </span>
            ) : (
              <span className="text-muted-foreground">…</span>
            )}
          </p>
        )}
        {change.before !== null && change.after !== null && delta !== null && (
          <p className="flex flex-wrap items-baseline gap-x-2 font-mono text-xs tabular-nums">
            <span className="text-muted-foreground">
              {formatBytes(byteSize(change.before))} → {formatBytes(byteSize(change.after))}
            </span>
            <span className={delta < 0 ? 'text-success' : delta > 0 ? 'text-destructive' : 'text-muted-foreground'}>
              {formatByteDelta(delta)}
            </span>
          </p>
        )}
        {newlyFailing.length > 0 && (
          <p
            className="truncate text-xs text-destructive"
            title={`Newly failing: ${newlyFailing.map(c => c.name).join(', ')}`}
          >
            Newly failing: {newlyFailing.map(c => c.name).join(', ')}
          </p>
        )}
      </div>
    </button>
  );
}
