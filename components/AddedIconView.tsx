'use client';

import { useState } from 'react';

import { ArrowLeft, GitCompareArrows, LoaderCircle } from 'lucide-react';

import { useSvgAnalysis } from '@/hooks/useSvgAnalysis';
import type { SvgItem } from '@/types/diff';
import { formatBytes } from '@/utils/formatBytes';
import { getQualityTier, MAX_QUALITY_SCORE, type QualityTier } from '@/utils/qualityChecks';

import CodeView from './CodeView';
import { SELECT_CLASS } from './CompareToolbar';
import CompareView from './CompareView';
import { GridPreview, guideKindFor, isLightIcon, svgDataUrl } from './GridPreview';
import QualityChecklist from './QualityChecklist';
import SizeLadder from './SizeLadder';
import { BUTTON_PRIMARY, BUTTON_SECONDARY, INPUT_CLASS, SECTION_TITLE } from './ui';

const TIER_TEXT: Record<QualityTier, string> = {
  good: 'text-success',
  ok: 'text-warning',
  poor: 'text-destructive',
};

interface AddedIconViewProps {
  item: SvgItem;
  /** The same icon in the other theme (light_ counterpart), when it is part of the same set */
  counterpart?: SvgItem | null;
  /** Icons that can be picked as A for "Compare with…" (e.g. uploads) */
  candidates?: SvgItem[];
  /** Load a file from the base branch for "Compare with…"; the field is hidden without it */
  fetchBaseFile?: (path: string) => Promise<string>;
  /** Directory of the icon in the repo, for the suggested base-branch path */
  dir?: string;
}

export default function AddedIconView({ item, counterpart, candidates = [], fetchBaseFile, dir }: AddedIconViewProps) {
  const analysis = useSvgAnalysis(item.content, item.name);
  const [compareWith, setCompareWith] = useState<SvgItem | null>(null);
  const kind = guideKindFor(item.name);
  const [basePath, setBasePath] = useState(
    `${dir ? `${dir}/` : ''}${kind === 'folder' ? 'default_folder.svg' : 'default_file.svg'}`,
  );
  const [baseLoading, setBaseLoading] = useState(false);
  const [baseError, setBaseError] = useState<string | null>(null);

  if (compareWith) {
    return (
      <div className="space-y-4">
        <button onClick={() => setCompareWith(null)} className={BUTTON_SECONDARY}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {item.name}
        </button>
        <CompareView a={compareWith} b={item} labels={['Reference', 'New']} initialMode="side" />
      </div>
    );
  }

  const loadBase = async () => {
    if (!fetchBaseFile || !basePath.trim()) return;
    setBaseLoading(true);
    setBaseError(null);
    try {
      const path = basePath.trim();
      const content = await fetchBaseFile(path);
      setCompareWith({ id: `base:${path}`, name: path.split('/').pop() || path, content, source: { kind: 'paste' } });
    } catch (err) {
      setBaseError(err instanceof Error ? err.message : String(err));
    } finally {
      setBaseLoading(false);
    }
  };

  // Dark theme first, so the pair always reads dark → light
  const pair = counterpart ? (isLightIcon(item.name) ? [counterpart, item] : [item, counterpart]) : null;
  const gridItems = [item, ...(counterpart ? [counterpart] : [])].map(i => ({
    src: svgDataUrl(i.content),
    label: counterpart ? i.name : undefined,
  }));
  const metadata = analysis?.metadata;
  const otherCandidates = candidates.filter(c => c.id !== item.id);

  return (
    <div className="space-y-10">
      {/* Previews + score */}
      <div className="flex flex-wrap items-end gap-3">
        <GridPreview items={gridItems} alt={item.name} kind={kind} className="h-36 w-36" />
        <div className="flex h-36 w-36 items-center justify-center rounded-md border border-border bg-stage-dark">
          <img src={svgDataUrl(item.content)} alt={`${item.name} on dark`} className="h-24 w-24" />
        </div>
        <div className="flex h-36 w-36 items-center justify-center rounded-md border border-border bg-stage-light">
          <img src={svgDataUrl(item.content)} alt={`${item.name} on light`} className="h-24 w-24" />
        </div>
        {analysis && (
          <div className="flex flex-col gap-1 pl-3 sm:pl-5" title="Quality score">
            <span
              className={`inline-flex items-baseline gap-1.5 font-mono text-5xl font-bold leading-none tabular-nums ${TIER_TEXT[getQualityTier(analysis.score)]}`}
            >
              {analysis.score}
              <span className="text-xl font-medium text-muted-foreground">/ {MAX_QUALITY_SCORE}</span>
            </span>
          </div>
        )}
      </div>

      <section className="space-y-3">
        <h3 className={SECTION_TITLE}>Size ladder</h3>
        <SizeLadder content={item.content} />
      </section>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-8">
        <section className="space-y-3">
          <h3 className={SECTION_TITLE}>Quality checks</h3>
          {metadata ? (
            <QualityChecklist metadata={metadata} />
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Analyzing…
            </p>
          )}
        </section>

        <section className="space-y-3">
          <h3 className={SECTION_TITLE}>Metadata</h3>
          {metadata && analysis && (
            <dl className="divide-y divide-border rounded-md border border-border bg-card px-3 font-mono text-xs [&>div]:py-2">
              {[
                ['File', item.name],
                ['Size', formatBytes(metadata.byteSize)],
                ['Gzip (est.)', formatBytes(metadata.gzipSize)],
                ['viewBox', metadata.viewBox ?? 'missing'],
                ...(metadata.width || metadata.height
                  ? [['Dimensions', `${metadata.width ?? '?'}×${metadata.height ?? '?'}`]]
                  : []),
                ['Content', metadata.marginDetails],
                ['Lines', `${metadata.lineCount}${metadata.hasTrailingNewline ? ' + trailing newline' : ''}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="truncate" title={v}>
                    {v}
                  </dd>
                </div>
              ))}
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Colors</dt>
                <dd className="flex flex-wrap justify-end gap-1">
                  {metadata.colors.length === 0 && 'none'}
                  {metadata.colors.map(c => (
                    <span key={c} className="inline-flex items-center gap-1" title={c}>
                      <span
                        className="inline-block h-3 w-3 rounded-[2px] border border-border"
                        style={{ backgroundColor: c }}
                      />
                      {c}
                    </span>
                  ))}
                </dd>
              </div>
              {analysis.externalRefs.length > 0 && (
                <div className="flex justify-between gap-4 text-destructive">
                  <dt>External refs (not rendered)</dt>
                  <dd className="truncate">{analysis.externalRefs.join(', ')}</dd>
                </div>
              )}
            </dl>
          )}
        </section>
      </div>

      {pair && (
        <section className="space-y-3">
          <h3 className={SECTION_TITLE}>Theme pair</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {(['bg-stage-dark text-stage-dark-foreground', 'bg-stage-light text-stage-light-foreground'] as const).map(
              bg => (
                <div key={bg} className={`flex justify-around gap-4 rounded-md border border-border p-4 ${bg}`}>
                  {pair.map(p => (
                    <div key={p.id} className="flex flex-col items-center gap-2">
                      <img src={svgDataUrl(p.content)} alt={p.name} className="h-16 w-16" />
                      <span className="font-mono text-xs opacity-70">{p.name}</span>
                    </div>
                  ))}
                </div>
              ),
            )}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h3 className={SECTION_TITLE}>Source</h3>
        <CodeView content={item.content} />
      </section>

      {(otherCandidates.length > 0 || fetchBaseFile) && (
        <section className="space-y-3">
          <h3 className={SECTION_TITLE}>Compare with…</h3>
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card p-3 text-sm">
            {otherCandidates.length > 0 && (
              <label className="inline-flex items-center gap-2 text-muted-foreground">
                Uploaded icon
                <select
                  value=""
                  onChange={e => {
                    const picked = otherCandidates.find(c => c.id === e.target.value);
                    if (picked) setCompareWith(picked);
                  }}
                  className={SELECT_CLASS}
                >
                  <option value="">Pick…</option>
                  {otherCandidates.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {fetchBaseFile && (
              <div className="flex min-w-64 flex-1 items-center gap-2">
                <label htmlFor="base-branch-file" className="whitespace-nowrap text-muted-foreground">
                  Base branch file
                </label>
                <input
                  id="base-branch-file"
                  value={basePath}
                  onChange={e => setBasePath(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') void loadBase();
                  }}
                  spellCheck={false}
                  className={`${INPUT_CLASS} h-8 min-w-0 flex-1 px-2 font-mono text-xs`}
                />
                <button
                  onClick={() => void loadBase()}
                  disabled={baseLoading || !basePath.trim()}
                  className={BUTTON_PRIMARY}
                >
                  {baseLoading ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <GitCompareArrows className="h-3.5 w-3.5" />
                  )}
                  Compare
                </button>
              </div>
            )}
            {baseError && <p className="w-full text-destructive">{baseError}</p>}
          </div>
        </section>
      )}
    </div>
  );
}
