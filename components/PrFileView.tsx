'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { ChevronLeft, ChevronRight, ExternalLink, LoaderCircle, RotateCw, X } from 'lucide-react';

import { useAppContext } from '@/context/AppContext';
import { useHotkeys } from '@/hooks/useHotkeys';
import type { CompareMode, PrSvgChange, PullRequestInfo, SvgItem } from '@/types/diff';
import { getFilenameFromPath } from '@/utils/analyzeSvg';
import { blobUrl } from '@/utils/githubPr';

import AddedIconView from './AddedIconView';
import { MODES } from './CompareToolbar';
import CompareView, { type CompareTab } from './CompareView';
import { themeCounterpart } from './GridPreview';
import { BUTTON_ICON, BUTTON_SECONDARY, CHIP, NOTICE_ERROR } from './ui';

const NAV_BUTTON = BUTTON_ICON;

interface PrFileViewProps {
  info: PullRequestInfo;
  /** Files in on-screen order, for [ and ] */
  changes: PrSvgChange[];
  /** Every SVG change in the PR, to find a new icon's theme counterpart */
  allChanges: PrSvgChange[];
  path: string;
  fileErrors: Record<string, string>;
  loadFile: (path: string, retry?: boolean) => void;
  fetchBaseFile: (path: string) => Promise<string>;
  onNavigate: (path: string) => void;
  onClose: () => void;
}

export default function PrFileView({
  info,
  changes,
  allChanges,
  path,
  fileErrors,
  loadFile,
  fetchBaseFile,
  onNavigate,
  onClose,
}: PrFileViewProps) {
  const { items: uploads } = useAppContext();
  // Kept here, not in CompareView, so the chosen mode and tab survive [ / ] to the next file
  const [mode, setMode] = useState<CompareMode>(MODES[0].value);
  const [tab, setTab] = useState<CompareTab>('visual');
  const index = changes.findIndex(c => c.path === path);
  const change = changes[index] ?? allChanges.find(c => c.path === path);
  const prev = index > 0 ? changes[index - 1] : null;
  const next = index !== -1 && index < changes.length - 1 ? changes[index + 1] : null;

  const name = getFilenameFromPath(path);
  const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
  const counterpartPath = `${dir ? `${dir}/` : ''}${themeCounterpart(name)}`;
  const counterpart =
    change?.kind === 'added' ? allChanges.find(c => c.path === counterpartPath && c.kind === 'added') : undefined;

  useEffect(() => {
    loadFile(path);
    if (counterpart) loadFile(counterpart.path);
  }, [path, counterpart, loadFile]);

  // Bubble phase, unlike the modals: a grid preview opened from this view
  // handles Esc while capturing and stops it, so Esc closes that first
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useHotkeys({
    '[': () => prev && onNavigate(prev.path),
    ']': () => next && onNavigate(next.path),
  });

  // Keep the page behind from scrolling while this covers it
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  const baseRepo = `${info.owner}/${info.repo}`;
  const error = fileErrors[path];
  const asItem = (content: string, side: 'before' | 'after', p: string): SvgItem => ({
    id: `pr:${side}:${p}`,
    name: getFilenameFromPath(p),
    content,
    source:
      side === 'after'
        ? { kind: 'pr', repo: info.headRepo, ref: info.headSha, path: p }
        : { kind: 'pr', repo: baseRepo, ref: info.mergeBaseSha, path: p },
  });

  let body: React.ReactNode;
  if (!change) {
    body = <p className="text-sm text-muted-foreground">{path} is not an added or updated SVG in this PR.</p>;
  } else if (error) {
    body = (
      <div className="space-y-3 text-sm">
        <p className={NOTICE_ERROR}>{error}</p>
        <button onClick={() => loadFile(path, true)} className={BUTTON_SECONDARY}>
          <RotateCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  } else if (change.kind === 'added' && change.after !== null) {
    body = (
      <AddedIconView
        key={path}
        item={asItem(change.after, 'after', path)}
        counterpart={
          counterpart?.kind === 'added' && counterpart.after !== null
            ? asItem(counterpart.after, 'after', counterpart.path)
            : null
        }
        candidates={uploads}
        fetchBaseFile={fetchBaseFile}
        dir={dir}
      />
    );
  } else if (change.kind === 'updated' && change.before !== null && change.after !== null) {
    body = (
      <CompareView
        key={path}
        a={asItem(change.before, 'before', change.previousPath ?? path)}
        b={asItem(change.after, 'after', path)}
        labels={['Before', 'After']}
        mode={mode}
        onModeChange={setMode}
        tab={tab}
        onTabChange={setTab}
      />
    );
  } else {
    body = (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Loading {name}…
      </p>
    );
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background animate-in"
      role="dialog"
      aria-modal="true"
      aria-label={path}
    >
      <div className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-2 sm:px-6">
        {change && (
          <span
            className={`${CHIP} ${
              change.kind === 'added' ? 'bg-success-soft text-success' : 'bg-plate-a-soft text-plate-a'
            }`}
          >
            {change.kind === 'added' ? 'Added' : 'Updated'}
          </span>
        )}
        <h2
          className="order-last w-full min-w-0 truncate font-mono text-[15px] font-semibold sm:order-none sm:w-auto sm:flex-1"
          title={path}
        >
          {change?.kind === 'updated' && change.previousPath && (
            <span className="text-muted-foreground">{change.previousPath} → </span>
          )}
          {path}
        </h2>
        <a
          href={blobUrl(info.headRepo, info.headSha, path)}
          target="_blank"
          rel="noopener noreferrer"
          className={NAV_BUTTON}
          title="Open on GitHub"
          aria-label="Open on GitHub"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
        <div className="flex items-center rounded-sm border border-border">
          <button
            onClick={() => prev && onNavigate(prev.path)}
            disabled={!prev}
            className={`${NAV_BUTTON} rounded-r-none`}
            title="Previous file ([)"
            aria-label="Previous file"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {index !== -1 && (
            <span className="border-x border-border px-2 font-mono text-xs leading-8 tabular-nums text-muted-foreground">
              {index + 1} / {changes.length}
            </span>
          )}
          <button
            onClick={() => next && onNavigate(next.path)}
            disabled={!next}
            className={`${NAV_BUTTON} rounded-l-none`}
            title="Next file (])"
            aria-label="Next file"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button onClick={onClose} className={NAV_BUTTON} title="Close (Esc)" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{body}</div>
      </div>
    </div>,
    document.body,
  );
}
