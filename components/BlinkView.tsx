'use client';

import { useEffect, useState } from 'react';

import { Pause, Play } from 'lucide-react';

import { useHotkeys } from '@/hooks/useHotkeys';
import type { SvgItem } from '@/types/diff';

import type { ViewSettings } from './CompareToolbar';
import IconLayer from './IconLayer';
import RangeInput from './RangeInput';
import Stage from './Stage';
import { BUTTON_SMALL, HINT_LIST } from './ui';

interface BlinkViewProps {
  a: SvgItem;
  b: SvgItem;
  settings: ViewSettings;
  labels: [string, string];
}

export default function BlinkView({ a, b, settings, labels }: BlinkViewProps) {
  const [showB, setShowB] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [interval, setIntervalMs] = useState(500);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setShowB(v => !v), interval);
    return () => clearInterval(id);
  }, [playing, interval]);

  useHotkeys({ ' ': () => setPlaying(p => !p) });

  return (
    <div className="flex flex-col items-center gap-3">
      <Stage
        settings={settings}
        label={showB ? labels[1] : labels[0]}
        className="cursor-pointer"
        onClick={() => {
          // Clicking steps manually, so pause the timer
          setPlaying(false);
          setShowB(v => !v);
        }}
      >
        {/* Both stay mounted so switching never waits for a render */}
        <IconLayer content={a.content} size={settings.size} alt={labels[0]} className={showB ? 'invisible' : ''} />
        <IconLayer content={b.content} size={settings.size} alt={labels[1]} className={showB ? '' : 'invisible'} />
      </Stage>
      <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
        <button onClick={() => setPlaying(p => !p)} className={BUTTON_SMALL} title="Play / pause (Space)">
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {playing ? 'Pause' : 'Play'}
        </button>
        <span className="inline-flex items-center gap-2">
          Every
          <RangeInput
            value={interval}
            onChange={setIntervalMs}
            min={100}
            max={2000}
            step={50}
            unit="ms"
            aria-label="Blink interval"
          />
        </span>
        <ul className={HINT_LIST}>
          <li>
            <kbd>Space</kbd> pauses
          </li>
          <li>click the preview to step</li>
        </ul>
      </div>
    </div>
  );
}
