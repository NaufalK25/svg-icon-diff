'use client';

import type { SvgItem } from '@/types/diff';

import type { ViewSettings } from './CompareToolbar';
import { RULER_SIZE } from './GridPreview';
import IconLayer from './IconLayer';
import Stage from './Stage';

interface SideBySideViewProps {
  items: { item: SvgItem; label: string }[];
  settings: ViewSettings;
}

export default function SideBySideView({ items, settings }: SideBySideViewProps) {
  return (
    <div className="flex flex-wrap items-start justify-center gap-4">
      {items.map(({ item, label }, i) => (
        <div key={item.id} className="space-y-1.5">
          {/* Indented by the ruler width so the name lines up with the stage, not the ruler */}
          <p
            className="flex max-w-full items-center gap-1.5 truncate text-xs text-muted-foreground"
            style={{ paddingLeft: RULER_SIZE }}
            title={item.name}
          >
            {label && (
              <span
                className={`font-semibold ${i === 0 ? 'text-plate-a' : i === 1 ? 'text-plate-b' : 'text-foreground'}`}
              >
                {label}
              </span>
            )}
            <span className="truncate font-mono text-foreground">{item.name}</span>
          </p>
          <Stage settings={settings}>
            <IconLayer content={item.content} size={settings.size} alt={item.name} />
          </Stage>
        </div>
      ))}
    </div>
  );
}
