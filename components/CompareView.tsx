'use client';

import { useState } from 'react';

import { Code, Eye, ListChecks } from 'lucide-react';

import { useHotkeys } from '@/hooks/useHotkeys';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { CompareMode, SvgItem } from '@/types/diff';
import { formatContentSize } from '@/utils/formatBytes';

import BlinkView from './BlinkView';
import CodeDiff from './CodeDiff';
import CompareToolbar, { DEFAULT_VIEW_SETTINGS, MODES, type ViewSettings } from './CompareToolbar';
import DifferenceView from './DifferenceView';
import { type GuideKind, guideKindFor } from './GridPreview';
import MetadataDiff from './MetadataDiff';
import OnionView from './OnionView';
import OverprintView from './OverprintView';
import SideBySideView from './SideBySideView';
import SwipeView from './SwipeView';
import { tabClass } from './ui';

export type CompareTab = 'visual' | 'code' | 'metadata';

const TABS: { value: CompareTab; label: string; icon: typeof Eye }[] = [
  { value: 'visual', label: 'Visual', icon: Eye },
  { value: 'code', label: 'Code diff', icon: Code },
  { value: 'metadata', label: 'Metadata', icon: ListChecks },
];

interface CompareViewProps {
  a: SvgItem;
  b: SvgItem;
  /** More icons shown in side-by-side mode after A and B */
  others?: SvgItem[];
  initialMode?: CompareMode;
  /** Names for A and B, e.g. "Before" / "After" */
  labels?: [string, string];
  /** Controlled mode and tab, for a parent that keeps them while the view remounts per file */
  mode?: CompareMode;
  onModeChange?: (mode: CompareMode) => void;
  tab?: CompareTab;
  onTabChange?: (tab: CompareTab) => void;
}

export default function CompareView({
  a,
  b,
  others = [],
  initialMode = MODES[0].value,
  labels = ['A', 'B'],
  mode: controlledMode,
  onModeChange,
  tab: controlledTab,
  onTabChange,
}: CompareViewProps) {
  const [ownTab, setOwnTab] = useState<CompareTab>('visual');
  const [ownMode, setOwnMode] = useState<CompareMode>(initialMode);
  const tab = controlledTab ?? ownTab;
  const mode = controlledMode ?? ownMode;
  const setTab = (t: CompareTab) => {
    setOwnTab(t);
    onTabChange?.(t);
  };
  const setMode = (m: CompareMode) => {
    setOwnMode(m);
    onModeChange?.(m);
  };
  // Size, zoom and background carry over between icons and visits; the guide set follows the file
  const [stored, setStored] = useLocalStorage('compareView', DEFAULT_VIEW_SETTINGS);
  const [kindFor, setKindFor] = useState<{ name: string; kind: GuideKind }>({
    name: b.name,
    kind: guideKindFor(b.name),
  });
  // A manual pick holds until B becomes a different file
  const kind = kindFor.name === b.name ? kindFor.kind : guideKindFor(b.name);
  const setKind = (k: GuideKind) => setKindFor({ name: b.name, kind: k });
  const settings: ViewSettings = { ...DEFAULT_VIEW_SETTINGS, ...stored, kind };

  const onChange = ({ kind: k, ...patch }: Partial<ViewSettings>) => {
    if (k) setKind(k);
    if (Object.keys(patch).length) setStored({ ...stored, ...patch });
  };

  // 1–5 pick a mode
  useHotkeys(
    Object.fromEntries(
      MODES.map((m, i) => [
        String(i + 1),
        () => {
          setTab('visual');
          setMode(m.value);
        },
      ]),
    ),
  );

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end gap-x-6 border-b border-border sm:flex-nowrap">
        <div
          className="-mb-px flex overflow-x-auto overflow-y-hidden scrollbar-hide sm:shrink-0"
          role="tablist"
          aria-label="Comparison"
        >
          {TABS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={`${tabClass(tab === value)} first:pl-0 first:after:left-0`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
        <p className="ml-auto flex min-w-0 max-w-full items-center gap-2 pb-2.5 text-xs">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 font-semibold text-plate-a">{labels[0]}</span>
            <span className="truncate font-mono text-foreground" title={a.name}>
              {a.name}
            </span>
            <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
              {formatContentSize(a.content)}
            </span>
          </span>
          <span className="shrink-0 text-muted-foreground" aria-hidden>
            →
          </span>
          <span className="sr-only">to</span>
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 font-semibold text-plate-b">{labels[1]}</span>
            <span className="truncate font-mono text-foreground" title={b.name}>
              {b.name}
            </span>
            <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
              {formatContentSize(b.content)}
            </span>
          </span>
        </p>
      </div>

      {tab === 'visual' && (
        <div className="space-y-4">
          <CompareToolbar mode={mode} onModeChange={setMode} settings={settings} onChange={onChange} />
          {/* The work area: a recessed well so the stage reads as the canvas, not as one more card */}
          <div className="rounded-md border border-border bg-well px-3 py-6 sm:px-6 sm:py-8">
            {mode === 'swipe' && <SwipeView a={a} b={b} settings={settings} labels={labels} />}
            {mode === 'difference' && <DifferenceView a={a} b={b} settings={settings} />}
            {mode === 'onion' && <OnionView a={a} b={b} settings={settings} labels={labels} />}
            {mode === 'blink' && <BlinkView a={a} b={b} settings={settings} labels={labels} />}
            {mode === 'overprint' && <OverprintView a={a} b={b} settings={settings} labels={labels} />}
            {mode === 'side' && (
              <SideBySideView
                settings={settings}
                items={[
                  { item: a, label: labels[0] },
                  { item: b, label: labels[1] },
                  ...others.map(item => ({ item, label: '' })),
                ]}
              />
            )}
          </div>
        </div>
      )}
      {tab === 'code' && <CodeDiff a={a.content} b={b.content} labels={labels} />}
      {tab === 'metadata' && <MetadataDiff a={a} b={b} labels={labels} />}
    </section>
  );
}
