'use client';

import { useEffect } from 'react';

import { LoaderCircle, RotateCw } from 'lucide-react';

import { useInView } from '@/hooks/useInView';
import { useSvgAnalysis } from '@/hooks/useSvgAnalysis';
import type { PrSvgChange } from '@/types/diff';
import { getFilenameFromPath } from '@/utils/analyzeSvg';
import { formatBytes } from '@/utils/formatBytes';
import { getQualityTier, isPassing, MAX_QUALITY_SCORE, type QualityTier } from '@/utils/qualityChecks';

import { svgDataUrl } from './GridPreview';
import { CHIP } from './ui';

export const TIER_TEXT: Record<QualityTier, string> = {
  good: 'text-success',
  ok: 'text-warning',
  poor: 'text-destructive',
};

export const CARD_CLASS =
  'flex flex-col gap-2.5 rounded-md border border-border bg-card p-3 text-left transition-[border-color,transform] hover:-translate-y-px hover:border-input active:translate-y-0 motion-reduce:hover:translate-y-0';

/** Small retry control inside a card (the card itself is the button) */
export const RETRY_CLASS =
  'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm hover:bg-destructive/15 focus-visible:outline-2 focus-visible:outline-ring';

interface AddedCardProps {
  change: Extract<PrSvgChange, { kind: 'added' }>;
  thumbSize: number;
  error?: string;
  onVisible: () => void;
  onRetry: () => void;
  onOpen: () => void;
}

export default function AddedCard({ change, thumbSize, error, onVisible, onRetry, onOpen }: AddedCardProps) {
  const { ref, inView } = useInView<HTMLButtonElement>();
  const name = getFilenameFromPath(change.path);
  const analysis = useSvgAnalysis(change.after, name);

  useEffect(() => {
    if (inView) onVisible();
  }, [inView, onVisible]);

  const failing = analysis?.checks.filter(c => !isPassing(c)) ?? [];
  const box = Math.max(thumbSize, 32) + 24;

  return (
    <button ref={ref} onClick={onOpen} className={CARD_CLASS} title={change.path}>
      <div className="flex justify-center gap-1.5">
        {['bg-stage-dark', 'bg-stage-light'].map(bg => (
          <div
            key={bg}
            className={`flex items-center justify-center rounded-sm border border-border ${bg}`}
            style={{ width: box, height: box }}
          >
            {change.after ? (
              <img src={svgDataUrl(change.after)} alt="" width={thumbSize} height={thumbSize} />
            ) : error ? null : (
              <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        ))}
      </div>
      <div className="min-w-0 space-y-1">
        <p className="flex items-center gap-1.5">
          <span className={`${CHIP} shrink-0 bg-success-soft text-success`}>new</span>
          <span className="truncate font-mono text-xs">{name}</span>
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
          <p className="flex items-baseline gap-3 font-mono text-xs tabular-nums text-muted-foreground">
            {analysis ? (
              <>
                <span className={`text-sm font-semibold ${TIER_TEXT[getQualityTier(analysis.score)]}`}>
                  {analysis.score}/{MAX_QUALITY_SCORE}
                </span>
                <span>{formatBytes(analysis.metadata.byteSize)}</span>
              </>
            ) : (
              '…'
            )}
          </p>
        )}
        {failing.length > 0 && (
          <p className="truncate text-xs text-destructive" title={failing.map(c => c.name).join(', ')}>
            {failing.map(c => c.name).join(', ')}
          </p>
        )}
      </div>
    </button>
  );
}
