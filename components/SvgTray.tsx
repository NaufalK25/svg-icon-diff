'use client';

import { ArrowLeftRight, Trash2, X } from 'lucide-react';

import { useAppContext } from '@/context/AppContext';
import { formatBytes } from '@/utils/formatBytes';

import { svgDataUrl, THEME_PREVIEW_BG } from './GridPreview';
import { BUTTON_SMALL, HINT_LIST, SECTION_COUNT, SECTION_TITLE } from './ui';

export default function SvgTray() {
  const { items, baseId, compareId, setBaseId, setCompareId, removeItem, clearItems, swap } = useAppContext();
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className={SECTION_TITLE}>
          Icons<span className={SECTION_COUNT}>({items.length})</span>
        </h2>
        <ul className={HINT_LIST}>
          <li>Click to compare (B)</li>
          <li>Shift+click to set the base (A)</li>
          <li>
            <kbd>X</kbd> swaps
          </li>
          <li>
            <kbd>←</kbd> <kbd>→</kbd> step through B
          </li>
        </ul>
        <div className="ml-auto flex gap-1.5">
          {items.length > 1 && (
            <button onClick={swap} className={BUTTON_SMALL} title="Swap A and B (X)">
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Swap
            </button>
          )}
          <button onClick={clearItems} className={BUTTON_SMALL}>
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pt-1 pb-2">
        {items.map(item => {
          const role = item.id === baseId ? 'A' : item.id === compareId ? 'B' : null;
          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={e => (e.shiftKey ? setBaseId(item.id) : setCompareId(item.id))}
              onKeyDown={e => {
                if (e.key === 'Enter') (e.shiftKey ? setBaseId : setCompareId)(item.id);
              }}
              aria-pressed={role === 'B'}
              className={`group relative flex w-32 shrink-0 flex-col items-center gap-1.5 rounded-md border p-2.5 transition-colors ${
                role === 'A'
                  ? 'border-plate-a bg-plate-a-soft shadow-[inset_0_0_0_1px_var(--plate-a)]'
                  : role === 'B'
                    ? 'border-plate-b bg-plate-b-soft shadow-[inset_0_0_0_1px_var(--plate-b)]'
                    : 'border-border bg-card hover:border-input'
              }`}
              title={item.name}
            >
              {role && (
                <span
                  className={`absolute left-1.5 top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-sm px-1 font-mono text-xs font-bold text-plate-foreground ${
                    role === 'A' ? 'bg-plate-a' : 'bg-plate-b'
                  }`}
                >
                  {role}
                </span>
              )}
              <button
                onClick={e => {
                  e.stopPropagation();
                  removeItem(item.id);
                }}
                className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
                title="Remove"
                aria-label={`Remove ${item.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-sm border border-border ${THEME_PREVIEW_BG}`}
              >
                <img src={svgDataUrl(item.content)} alt="" className="h-8 w-8" />
              </div>
              <span className="w-full truncate text-center font-mono text-xs">{item.name}</span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {formatBytes(new Blob([item.content]).size)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
