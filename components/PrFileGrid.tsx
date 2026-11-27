'use client';

import type { PrSvgChange } from '@/types/diff';

import AddedCard from './AddedCard';
import { SECTION_COUNT, SECTION_TITLE } from './ui';
import UpdatedCard from './UpdatedCard';

interface PrFileGridProps {
  title: string;
  changes: PrSvgChange[];
  thumbSize: number;
  fileErrors: Record<string, string>;
  loadFile: (path: string, retry?: boolean) => void;
  onOpen: (path: string) => void;
}

export default function PrFileGrid({ title, changes, thumbSize, fileErrors, loadFile, onOpen }: PrFileGridProps) {
  if (changes.length === 0) return null;
  const minWidth = 2 * (Math.max(thumbSize, 32) + 24) + 48;

  return (
    <section className="space-y-3 pt-2">
      <h2 className={SECTION_TITLE}>
        {title}
        <span className={SECTION_COUNT}>({changes.length})</span>
      </h2>
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))` }}>
        {changes.map(change => {
          const common = {
            thumbSize,
            error: fileErrors[change.path],
            onVisible: () => loadFile(change.path),
            onRetry: () => loadFile(change.path, true),
            onOpen: () => onOpen(change.path),
          };
          return change.kind === 'added' ? (
            <AddedCard key={change.path} change={change} {...common} />
          ) : (
            <UpdatedCard key={change.path} change={change} {...common} />
          );
        })}
      </div>
    </section>
  );
}
