'use client';

import { useEffect, useRef, useState } from 'react';

import { usePixelDiff } from '@/hooks/usePixelDiff';
import type { SvgItem } from '@/types/diff';
import { DEFAULT_THRESHOLD, type DiffStyle, formatChangedPercent } from '@/utils/pixelDiff';

import type { ViewSettings } from './CompareToolbar';
import { toggleClass } from './CompareToolbar';
import { CANVAS } from './GridPreview';
import RangeInput from './RangeInput';
import Stage from './Stage';
import { SEGMENT_GROUP } from './ui';

// Raster resolution for 'fit': fine enough to see sub-pixel shifts in a 32px icon
const FIT_RESOLUTION = 256;
const BBOX_COLOR = 'var(--overlay-bbox)';

interface DifferenceViewProps {
  a: SvgItem;
  b: SvgItem;
  settings: ViewSettings;
}

export default function DifferenceView({ a, b, settings }: DifferenceViewProps) {
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [style, setStyle] = useState<DiffStyle>('difference');
  const resolution = settings.size === 'fit' ? FIT_RESOLUTION : settings.size;
  const diff = usePixelDiff(a.content, b.content, resolution, threshold, style);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !diff) return;
    canvas.width = diff.image.width;
    canvas.height = diff.image.height;
    canvas.getContext('2d')?.putImageData(diff.image, 0, 0);
  }, [diff]);

  // Bounding box in the icon's 32-unit space, which is what the grid shows
  const unit = CANVAS / resolution;
  const fmt = (n: number) => String(Math.round(n * unit * 100) / 100);

  return (
    <div className="flex flex-col items-center gap-3">
      <Stage
        settings={settings}
        // Unchanged pixels are black in the difference style, so the stage must be too
        backgroundClassName={style === 'difference' ? 'bg-diff-ground text-diff-ground-foreground' : undefined}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full [image-rendering:pixelated]"
          aria-label="Pixel difference"
        />
        {diff?.bbox && (
          <svg
            viewBox={`0 0 ${resolution} ${resolution}`}
            className="pointer-events-none absolute inset-0 h-full w-full"
          >
            <rect
              x={diff.bbox.x}
              y={diff.bbox.y}
              width={diff.bbox.width}
              height={diff.bbox.height}
              fill="none"
              style={{ stroke: BBOX_COLOR }}
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}
      </Stage>

      {/* Stats strip */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
        {diff ? (
          <>
            <span>
              <span className="font-mono text-sm font-semibold tabular-nums">
                {formatChangedPercent(diff.changed, diff.total)}
              </span>{' '}
              <span className="text-muted-foreground">
                changed ({diff.changed.toLocaleString()} of {diff.total.toLocaleString()} px at {resolution}×
                {resolution})
              </span>
            </span>
            <span className="text-muted-foreground">
              {diff.bbox ? (
                <>
                  {/* Same hue as the dashed box, at a text-safe lightness */}
                  <span className="font-semibold text-plate-a">changes in</span>{' '}
                  <span className="font-mono">
                    x {fmt(diff.bbox.x)}–{fmt(diff.bbox.x + diff.bbox.width)}, y {fmt(diff.bbox.y)}–
                    {fmt(diff.bbox.y + diff.bbox.height)}
                  </span>{' '}
                  (of {CANVAS})
                </>
              ) : (
                'No visual change'
              )}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">Rendering…</span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
        <div className={SEGMENT_GROUP} role="group" aria-label="Difference style">
          <button
            onClick={() => setStyle('difference')}
            aria-pressed={style === 'difference'}
            className={toggleClass(style === 'difference')}
          >
            Difference
          </button>
          <button
            onClick={() => setStyle('highlight')}
            aria-pressed={style === 'highlight'}
            className={toggleClass(style === 'highlight')}
          >
            Highlight
          </button>
        </div>
        <span
          className="inline-flex items-center gap-2"
          title="Channel difference (0–255) ignored as anti-aliasing noise"
        >
          Threshold
          <RangeInput value={threshold} onChange={setThreshold} min={0} max={255} aria-label="Threshold" />
        </span>
      </div>
    </div>
  );
}
