'use client';

import { useEffect, useRef, useState } from 'react';

import { useOverprint } from '@/hooks/useOverprint';
import type { SvgItem } from '@/types/diff';
import type { OverprintStyle } from '@/utils/overprint';
import { DEFAULT_THRESHOLD, formatChangedPercent } from '@/utils/pixelDiff';

import type { ViewSettings } from './CompareToolbar';
import { toggleClass } from './CompareToolbar';
import RangeInput from './RangeInput';
import Stage from './Stage';
import { NOTICE_WARNING, SEGMENT_GROUP } from './ui';

// Same raster resolution as the difference view at 'fit'
const FIT_RESOLUTION = 256;

function Swatch({ className }: { className: string }) {
  return <span className={`inline-block h-3 w-3 shrink-0 rounded-[2px] ring-1 ring-border ${className}`} aria-hidden />;
}

interface OverprintViewProps {
  a: SvgItem;
  b: SvgItem;
  settings: ViewSettings;
  labels: [string, string];
}

/**
 * A and B printed as two ink plates: shared ink dark, ink only A has in cyan, ink only B has
 * in magenta. A shape that moved shows a cyan edge on one side and a magenta edge on the
 * other, so the direction of every change reads at a glance.
 */
export default function OverprintView({ a, b, settings, labels }: OverprintViewProps) {
  const [style, setStyle] = useState<OverprintStyle>('shape');
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const resolution = settings.size === 'fit' ? FIT_RESOLUTION : settings.size;
  const result = useOverprint(a.content, b.content, resolution, style, threshold);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !result) return;
    canvas.width = result.image.width;
    canvas.height = result.image.height;
    canvas.getContext('2d')?.putImageData(result.image, 0, 0);
  }, [result]);

  const pct = (n: number) => (result ? formatChangedPercent(n, result.total) : '…');
  // Inner changes Shape mode measures but doesn't paint
  const hiddenInner = !!result && style === 'shape' && result.recolored > 0;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Always white paper: the inks only read as plates on it, whatever ground the toolbar has */}
      <Stage settings={settings} backgroundClassName="bg-overprint-paper text-stage-light-foreground">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full [image-rendering:pixelated]"
          aria-label={`Overprint of ${labels[0]} and ${labels[1]}`}
        />
      </Stage>

      {/* Legend: what each ink means, and how much of the canvas it covers */}
      <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs" aria-live="polite">
        <li className="inline-flex items-center gap-1.5">
          <Swatch className="bg-overprint-a" />
          <span className="font-semibold text-plate-a">{labels[0]} only</span>
          <span className="font-mono tabular-nums text-foreground">{pct(result?.aOnly ?? 0)}</span>
        </li>
        <li className="inline-flex items-center gap-1.5">
          <Swatch className="bg-overprint-b" />
          <span className="font-semibold text-plate-b">{labels[1]} only</span>
          <span className="font-mono tabular-nums text-foreground">{pct(result?.bOnly ?? 0)}</span>
        </li>
        {style === 'color' && (
          <li className="inline-flex items-center gap-1.5">
            <Swatch className="bg-overprint-recolor" />
            <span className="font-semibold text-foreground">Recoloured</span>
            <span className="font-mono tabular-nums text-foreground">{pct(result?.recolored ?? 0)}</span>
          </li>
        )}
        <li className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Swatch className="bg-overprint-both" />
          Both
        </li>
      </ul>

      <p className="text-xs text-muted-foreground">
        {result ? (
          result.changed === 0 ? (
            hiddenInner ? (
              'No change to the outline'
            ) : (
              'No visual change'
            )
          ) : (
            <>
              <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                {pct(result.changed)}
              </span>{' '}
              changed ({result.changed.toLocaleString()} of {result.total.toLocaleString()} px at {resolution}×
              {resolution})
            </>
          )
        ) : (
          'Rendering…'
        )}
      </p>

      {/* Shape compares where there is ink, so detail drawn inside a filled area can't show.
          Say so instead of letting the counts look complete */}
      {hiddenInner && (
        <p className={`${NOTICE_WARNING} flex flex-wrap items-center gap-x-2 gap-y-1 text-xs`} role="status">
          {pct(result?.recolored ?? 0)} of pixels changed inside shared shapes, which Shape can’t show.
          <button
            onClick={() => setStyle('color')}
            className="font-semibold underline decoration-input underline-offset-4 hover:decoration-foreground"
          >
            Show them in Colour
          </button>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
        <div className={SEGMENT_GROUP} role="group" aria-label="What to compare">
          <button
            onClick={() => setStyle('shape')}
            aria-pressed={style === 'shape'}
            className={toggleClass(style === 'shape')}
            title="Compare where each version has ink, ignoring colour"
          >
            Shape
          </button>
          <button
            onClick={() => setStyle('color')}
            aria-pressed={style === 'color'}
            className={toggleClass(style === 'color')}
            title="Also mark pixels both versions cover but in a different colour"
          >
            Colour
          </button>
        </div>
        <span
          className="inline-flex items-center gap-2"
          title="Coverage or colour difference (0–255) ignored as anti-aliasing noise"
        >
          Threshold
          <RangeInput value={threshold} onChange={setThreshold} min={0} max={255} aria-label="Threshold" />
        </span>
      </div>
    </div>
  );
}
