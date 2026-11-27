'use client';

import { Grid3x3, Ruler } from 'lucide-react';

import type { Background, CompareMode, RenderSize } from '@/types/diff';

import { BACKGROUNDS, type GuideKind } from './GridPreview';
import { SEGMENT_GROUP, segmentClass, SELECT_CLASS, toggleButtonClass } from './ui';

export interface ViewSettings {
  size: RenderSize;
  background: Background;
  grid: boolean;
  guides: boolean;
  kind: GuideKind;
  /** Stage width in CSS px */
  zoom: number;
}

export const DEFAULT_VIEW_SETTINGS: Omit<ViewSettings, 'kind'> = {
  size: 'fit',
  background: 'dark',
  grid: true,
  guides: false,
  zoom: 384,
};

/** Toolbar order, which is also the 1–6 hotkey order; the first is the default */
export const MODES: { value: CompareMode; label: string }[] = [
  { value: 'side', label: 'Side by side' },
  { value: 'swipe', label: 'Swipe' },
  { value: 'difference', label: 'Difference' },
  { value: 'onion', label: 'Onion skin' },
  { value: 'blink', label: 'Blink' },
  { value: 'overprint', label: 'Overprint' },
];

const SIZES: RenderSize[] = [16, 24, 32, 64, 'fit'];
const ZOOMS = [128, 256, 384, 512, 768];

/** Item of a segmented control; kept under this name for the views that import it */
export const toggleClass = segmentClass;
export { SELECT_CLASS };

const CLUSTER = 'flex items-center gap-1.5';
const CLUSTER_LABEL = 'text-xs text-muted-foreground';

interface CompareToolbarProps {
  mode: CompareMode;
  onModeChange: (mode: CompareMode) => void;
  settings: ViewSettings;
  onChange: (patch: Partial<ViewSettings>) => void;
}

export default function CompareToolbar({ mode, onModeChange, settings, onChange }: CompareToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <div
        className={`${SEGMENT_GROUP} max-w-full overflow-x-auto scrollbar-hide`}
        role="tablist"
        aria-label="Compare mode"
      >
        {MODES.map((m, i) => (
          <button
            key={m.value}
            role="tab"
            aria-selected={mode === m.value}
            onClick={() => onModeChange(m.value)}
            className={`${segmentClass(mode === m.value)} shrink-0`}
            title={`${m.label} (${i + 1})`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 lg:ml-auto">
        <div className={CLUSTER}>
          <label className={`inline-flex items-center gap-1.5 ${CLUSTER_LABEL}`} title="Render size">
            <Ruler className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Render size</span>
            <select
              value={String(settings.size)}
              onChange={e =>
                onChange({ size: e.target.value === 'fit' ? 'fit' : (Number(e.target.value) as RenderSize) })
              }
              className={SELECT_CLASS}
            >
              {SIZES.map(s => (
                <option key={s} value={String(s)}>
                  {s === 'fit' ? 'Fit (vector)' : `${s}px`}
                </option>
              ))}
            </select>
          </label>
          <label className={`inline-flex items-center gap-1.5 ${CLUSTER_LABEL}`} title="Zoom">
            Zoom
            <select
              value={settings.zoom}
              onChange={e => onChange({ zoom: Number(e.target.value) })}
              className={SELECT_CLASS}
            >
              {ZOOMS.map(z => (
                <option key={z} value={z}>
                  {z}px
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className={SEGMENT_GROUP} role="group" aria-label="Stage background">
          {(Object.keys(BACKGROUNDS) as Background[]).map(b => (
            <button
              key={b}
              onClick={() => onChange({ background: b })}
              aria-pressed={settings.background === b}
              className={segmentClass(settings.background === b)}
            >
              {BACKGROUNDS[b].label}
            </button>
          ))}
        </div>
        <div className={CLUSTER} role="group" aria-label="Overlays">
          <button
            onClick={() => onChange({ grid: !settings.grid })}
            aria-pressed={settings.grid}
            className={toggleButtonClass(settings.grid)}
          >
            <Grid3x3 className="h-3.5 w-3.5" />
            Grid
          </button>
          <button
            onClick={() => onChange({ guides: !settings.guides })}
            aria-pressed={settings.guides}
            className={toggleButtonClass(settings.guides)}
          >
            Guides
          </button>
          <div className={SEGMENT_GROUP} title="Guide set" role="group" aria-label="Guide set">
            <button
              onClick={() => onChange({ kind: 'file' })}
              aria-pressed={settings.kind === 'file'}
              className={segmentClass(settings.kind === 'file')}
            >
              File
            </button>
            <button
              onClick={() => onChange({ kind: 'folder' })}
              aria-pressed={settings.kind === 'folder'}
              className={segmentClass(settings.kind === 'folder')}
            >
              Folder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
