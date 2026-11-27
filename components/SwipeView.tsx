'use client';

import { useRef, useState } from 'react';

import { ArrowLeftRight, ArrowUpDown } from 'lucide-react';

import type { SvgItem } from '@/types/diff';

import type { ViewSettings } from './CompareToolbar';
import IconLayer from './IconLayer';
import Stage from './Stage';
import { HINT_LIST, STAGE_LABEL, toggleButtonClass } from './ui';

const clamp = (n: number) => Math.min(100, Math.max(0, n));

interface SwipeViewProps {
  a: SvgItem;
  b: SvgItem;
  settings: ViewSettings;
  labels: [string, string];
}

export default function SwipeView({ a, b, settings, labels }: SwipeViewProps) {
  const [pos, setPos] = useState(50);
  const [horizontal, setHorizontal] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const moveTo = (e: React.PointerEvent) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = horizontal ? (e.clientY - rect.top) / rect.height : (e.clientX - rect.left) / rect.width;
    setPos(clamp(pct * 100));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 1;
    const back = horizontal ? 'ArrowUp' : 'ArrowLeft';
    const forward = horizontal ? 'ArrowDown' : 'ArrowRight';
    if (e.key !== back && e.key !== forward && e.key !== 'Home' && e.key !== 'End') return;
    // Keep the page-level arrow shortcuts (next/previous icon) from firing too
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Home') setPos(0);
    else if (e.key === 'End') setPos(100);
    else setPos(p => clamp(p + (e.key === forward ? step : -step)));
  };

  // A shows before the divider, B past it (right of it, or below it when horizontal). Both are
  // clipped: if only B were, A would show through B's transparent areas, so a B smaller than A
  // would look as large as A
  const clipA = horizontal ? `inset(0 0 ${100 - pos}% 0)` : `inset(0 ${100 - pos}% 0 0)`;
  const clipB = horizontal ? `inset(${pos}% 0 0 0)` : `inset(0 0 0 ${pos}%)`;

  return (
    <div className="flex flex-col items-center gap-3">
      <Stage
        ref={stageRef}
        settings={settings}
        className="cursor-col-resize touch-none select-none"
        style={horizontal ? { cursor: 'row-resize' } : undefined}
        onPointerDown={e => {
          e.currentTarget.setPointerCapture(e.pointerId);
          moveTo(e);
        }}
        onPointerMove={e => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) moveTo(e);
        }}
        onDoubleClick={() => setPos(50)}
      >
        <IconLayer content={a.content} size={settings.size} alt={labels[0]} style={{ clipPath: clipA }} />
        <IconLayer content={b.content} size={settings.size} alt={labels[1]} style={{ clipPath: clipB }} />
        <div
          role="slider"
          tabIndex={0}
          aria-label="Swipe position"
          aria-orientation={horizontal ? 'vertical' : 'horizontal'}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos)}
          onKeyDown={onKeyDown}
          className={`absolute bg-overlay-divider shadow-[0_0_0_1px_var(--overlay-divider-edge)] focus:outline-none [&:focus-visible>span]:outline-2 [&:focus-visible>span]:outline-offset-2 [&:focus-visible>span]:outline-overlay-divider ${
            horizontal ? 'inset-x-0 h-0.5 -translate-y-1/2' : 'inset-y-0 w-0.5 -translate-x-1/2'
          }`}
          style={horizontal ? { top: `${pos}%` } : { left: `${pos}%` }}
        >
          <span className="absolute left-1/2 top-1/2 flex h-7 w-7 -translate-1/2 items-center justify-center rounded-full bg-overlay-divider text-stage-light-foreground shadow-[0_0_0_1px_var(--overlay-divider-edge),0_2px_6px_var(--overlay-divider-edge)]">
            {horizontal ? <ArrowUpDown className="h-3.5 w-3.5" /> : <ArrowLeftRight className="h-3.5 w-3.5" />}
          </span>
        </div>
        <span className={`${STAGE_LABEL} left-1.5 top-1.5 shadow-[inset_0_-2px_0_var(--plate-a)]`}>{labels[0]}</span>
        <span
          className={`${STAGE_LABEL} shadow-[inset_0_-2px_0_var(--plate-b)] ${horizontal ? 'bottom-1.5 left-1.5' : 'right-1.5 top-1.5'}`}
        >
          {labels[1]}
        </span>
      </Stage>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="w-10 text-right font-mono text-sm font-semibold tabular-nums text-foreground">
          {Math.round(pos)}%
        </span>
        <button
          onClick={() => setHorizontal(h => !h)}
          className={toggleButtonClass(horizontal)}
          aria-pressed={horizontal}
          title="Swipe direction"
        >
          {horizontal ? 'Horizontal divider' : 'Vertical divider'}
        </button>
        <ul className={HINT_LIST}>
          <li>Drag</li>
          <li>arrow keys move 1% (Shift 10%)</li>
          <li>double-click resets</li>
        </ul>
      </div>
    </div>
  );
}
