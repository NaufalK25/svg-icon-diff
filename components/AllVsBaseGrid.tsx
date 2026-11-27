'use client';

import { useAppContext } from '@/context/AppContext';
import { usePixelDiff } from '@/hooks/usePixelDiff';
import type { SvgItem } from '@/types/diff';
import { formatContentSize } from '@/utils/formatBytes';
import { formatChangedPercent } from '@/utils/pixelDiff';

import { svgDataUrl, THEME_PREVIEW_BG } from './GridPreview';
import { SECTION_TITLE } from './ui';

// Measured at the icons' native size, like the PR card badges
const DIFF_SIZE = 32;

function VsCard({
  base,
  item,
  active,
  onClick,
}: {
  base: SvgItem;
  item: SvgItem;
  active: boolean;
  onClick: () => void;
}) {
  const diff = usePixelDiff(base.content, item.content, DIFF_SIZE);
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col items-start gap-2.5 rounded-md border p-3 text-left transition-colors ${active
          ? 'border-plate-b bg-plate-b-soft shadow-[inset_0_0_0_1px_var(--plate-b)]'
          : 'border-border bg-card hover:border-input'
        }`}
      title={`${base.name} vs ${item.name}`}
    >
      <div className={`flex items-center gap-2 rounded-sm border border-border px-2.5 py-2 ${THEME_PREVIEW_BG}`}>
        <img src={svgDataUrl(base.content)} alt={base.name} className="h-8 w-8" />
        <span className="text-xs text-stage-light-foreground/60 dark:text-stage-dark-foreground/60">vs</span>
        <img src={svgDataUrl(item.content)} alt={item.name} className="h-8 w-8" />
      </div>
      <span className="flex w-full min-w-0 items-baseline gap-1.5 font-mono text-xs">
        <span className="truncate">{item.name}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">{formatContentSize(item.content)}</span>
      </span>
      <span
        className={`font-mono text-lg font-semibold leading-none tabular-nums ${!diff ? 'text-muted-foreground' : diff.changed === 0 ? 'text-success' : 'text-foreground'
          }`}
      >
        {diff ? formatChangedPercent(diff.changed, diff.total) : '…'}
      </span>
    </button>
  );
}

/** Every icon next to the base (A) with its changed-pixel share; click one to compare it as B */
export default function AllVsBaseGrid() {
  const { items, baseId, compareId, setCompareId } = useAppContext();
  const base = items.find(i => i.id === baseId);
  if (!base || items.length < 3) return null;

  return (
    <section className="space-y-3 border-t border-border pt-8">
      <h2 className={SECTION_TITLE}>
        All vs base <span className="font-mono font-normal text-muted-foreground">({base.name})</span>
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {items
          .filter(i => i.id !== base.id)
          .map(item => (
            <VsCard
              key={item.id}
              base={base}
              item={item}
              active={item.id === compareId}
              onClick={() => setCompareId(item.id)}
            />
          ))}
      </div>
    </section>
  );
}
