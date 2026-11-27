'use client';

import { ArrowUpDown } from 'lucide-react';

import { SELECT_CLASS, tabClass } from './ui';

export type PrCase = 'all' | 'added' | 'updated';
export type PrSort = 'path' | 'change' | 'size';

export const THUMB_SIZES = [16, 24, 32, 64];

const SORTS: { value: PrSort; label: string }[] = [
  { value: 'path', label: 'Path' },
  { value: 'change', label: 'Visual change' },
  { value: 'size', label: 'Size change' },
];

interface PrCaseTabsProps {
  active: PrCase;
  counts: Record<PrCase, number>;
  onChange: (value: PrCase) => void;
  sort: PrSort;
  onSortChange: (value: PrSort) => void;
  thumbSize: number;
  onThumbSizeChange: (value: number) => void;
}

export default function PrCaseTabs({
  active,
  counts,
  onChange,
  sort,
  onSortChange,
  thumbSize,
  onThumbSizeChange,
}: PrCaseTabsProps) {
  const tabs: { label: string; value: PrCase }[] = [
    { label: 'All', value: 'all' },
    { label: 'Added', value: 'added' },
    { label: 'Updated', value: 'updated' },
  ];

  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-2 border-b border-border">
      <div className="-mb-px flex overflow-x-auto overflow-y-hidden scrollbar-hide" role="tablist" aria-label="Files">
        {tabs.map(tab => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={active === tab.value}
            onClick={() => onChange(tab.value)}
            className={`${tabClass(active === tab.value)} first:pl-0 first:after:left-0`}
          >
            {tab.label}
            <span className="font-mono text-xs font-normal tabular-nums text-muted-foreground">
              ({counts[tab.value]})
            </span>
          </button>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-4 pb-2 text-xs text-muted-foreground">
        <label className="inline-flex items-center gap-1.5">
          <ArrowUpDown className="h-3.5 w-3.5" />
          Sort
          <select value={sort} onChange={e => onSortChange(e.target.value as PrSort)} className={SELECT_CLASS}>
            {SORTS.map(s => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-flex items-center gap-1.5">
          Size
          <select value={thumbSize} onChange={e => onThumbSizeChange(Number(e.target.value))} className={SELECT_CLASS}>
            {THUMB_SIZES.map(s => (
              <option key={s} value={s}>
                {s}px
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
