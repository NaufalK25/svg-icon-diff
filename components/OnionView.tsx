'use client';

import { useState } from 'react';

import type { SvgItem } from '@/types/diff';

import type { ViewSettings } from './CompareToolbar';
import IconLayer from './IconLayer';
import RangeInput from './RangeInput';
import Stage from './Stage';

interface OnionViewProps {
  a: SvgItem;
  b: SvgItem;
  settings: ViewSettings;
  labels: [string, string];
}

export default function OnionView({ a, b, settings, labels }: OnionViewProps) {
  const [opacity, setOpacity] = useState(50);

  return (
    <div className="flex flex-col items-center gap-3">
      <Stage settings={settings}>
        <IconLayer content={a.content} size={settings.size} alt={labels[0]} />
        <IconLayer content={b.content} size={settings.size} alt={labels[1]} style={{ opacity: opacity / 100 }} />
      </Stage>
      <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-semibold text-plate-a">{labels[0]}</span>
        <RangeInput
          value={opacity}
          onChange={setOpacity}
          min={0}
          max={100}
          unit="%"
          sliderClassName="w-40 sm:w-48"
          between={<span className="font-semibold text-plate-b">{labels[1]}</span>}
          aria-label={`${labels[1]} opacity`}
        />
      </div>
    </div>
  );
}
