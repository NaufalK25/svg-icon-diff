'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { TriangleAlert } from 'lucide-react';

import ErrorState from '@/components/ErrorState';
import Header from '@/components/Header';
import PrCaseTabs, { type PrCase, type PrSort } from '@/components/PrCaseTabs';
import PrFileGrid from '@/components/PrFileGrid';
import PrFileView from '@/components/PrFileView';
import PrSummary from '@/components/PrSummary';
import PrUrlInput from '@/components/PrUrlInput';
import SkeletonGrid from '@/components/SkeletonGrid';
import { EMPTY_STATE, NOTICE_WARNING } from '@/components/ui';
import { byteSize } from '@/components/UpdatedCard';
import { GITHUB_SIGN_IN_ENABLED, useAppContext } from '@/context/AppContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { usePullRequest } from '@/hooks/usePullRequest';
import type { PrSvgChange } from '@/types/diff';
import { MAX_PR_FILES, parseIssueUrl, parsePrUrl, prInputError, type PrRef, prUrl } from '@/utils/githubPr';

// Below this many API calls left (and no token), suggest adding one before reviews start failing
const LOW_RATE_LIMIT = 10;
// Stable empty list, so a hidden section doesn't change the memo dependencies every render
const NONE: PrSvgChange[] = [];

const EMPTY_MESSAGE: Record<PrCase, string> = {
  all: 'No added or updated SVG files in this pull request.',
  added: 'No added SVG files in this pull request.',
  updated: 'No updated SVG files in this pull request.',
};

/** Sort key; files whose numbers aren't known yet sort last */
function sortValue(change: PrSvgChange, sort: PrSort): number {
  if (sort === 'change') {
    if (change.kind === 'added') return Infinity;
    return change.diff ? -(change.diff.changed / change.diff.total) : Infinity;
  }
  if (change.kind === 'added') return change.after !== null ? -byteSize(change.after) : Infinity;
  if (change.before === null || change.after === null) return Infinity;
  return -Math.abs(byteSize(change.after) - byteSize(change.before));
}

// Shareable link: /pr?url=…&file=…
function prSearch(ref: PrRef, file: string | null): string {
  const p = new URLSearchParams({ url: prUrl(ref) });
  if (file) p.set('file', file);
  return `?${p.toString()}`;
}

function sortChanges(changes: PrSvgChange[], sort: PrSort): PrSvgChange[] {
  const byPath = (a: PrSvgChange, b: PrSvgChange) => a.path.localeCompare(b.path);
  if (sort === 'path') return [...changes].sort(byPath);
  return [...changes].sort((a, b) => sortValue(a, sort) - sortValue(b, sort) || byPath(a, b));
}

export default function PrReviewPage() {
  const { token, rateLimit } = useAppContext();
  const [input, setInput] = useState('');
  const [prRef, setPrRef] = useState<PrRef | null>(null);
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [filter, setFilter] = useState<PrCase>('all');
  const [sort, setSort] = useState<PrSort>('path');
  const [thumbSize, setThumbSize] = useLocalStorage<number>('prThumbSize', 32);
  const [tokenInputOpen, setTokenInputOpen] = useState(false);
  // Shown under the input; never together with the error box
  const [inputError, setInputError] = useState<string | null>(null);
  const pr = usePullRequest(prRef);

  // The input can't be reviewed: show why under it and drop whatever the page showed before,
  // so an old PR or error box never sits next to the new message
  const rejectInput = useCallback((message: string) => {
    setInputError(message);
    setPrRef(null);
    setOpenPath(null);
    history.replaceState(null, '', window.location.pathname);
  }, []);

  const applyUrl = useCallback(() => {
    const p = new URLSearchParams(window.location.search);
    const url = p.get('url');
    const ref = url ? parsePrUrl(url) : null;
    setInput(url ?? '');
    setInputError(null);
    setPrRef(ref);
    setOpenPath(ref ? p.get('file') : null);
    if (url && !ref) rejectInput(prInputError(parseIssueUrl(url)));
  }, [rejectInput]);

  // The page is prerendered without a URL, so ?url= and ?file= can only be read after hydration
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    applyUrl();
    window.addEventListener('popstate', applyUrl);
    return () => window.removeEventListener('popstate', applyUrl);
  }, [applyUrl]);

  // Input problems only GitHub can spot, e.g. owner/repo#1234 is an issue
  useEffect(() => {
    if (pr.inputError) rejectInput(pr.inputError);
  }, [pr.inputError, rejectInput]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const appTitle = document.title;
    if (!openPath) return;
    document.title = `${appTitle} | ${openPath.split('/').pop()}`;
    return () => {
      document.title = appTitle;
    };
  }, [openPath]);

  const submit = (ref: PrRef) => {
    setInputError(null);
    setOpenPath(null);
    setFilter('all');
    // Same PR again: reload it, e.g. after new commits were pushed
    if (prRef && prUrl(prRef) === prUrl(ref)) {
      pr.reload();
      history.replaceState(null, '', prSearch(ref, null));
    } else {
      setPrRef(ref);
      history.pushState(null, '', prSearch(ref, null));
    }
  };

  // Every file shown gets its own history entry. fileDepth counts the entries back to the grid;
  // it is absent when no grid lies behind them, as when the file came from a shared link.
  const showFile = useCallback(
    (path: string, fileDepth: number | undefined) => {
      if (!prRef) return;
      setOpenPath(path);
      history.pushState({ fileDepth }, '', prSearch(prRef, path));
    },
    [prRef],
  );
  const openFile = useCallback((path: string) => showFile(path, 1), [showFile]);
  const stepFile = useCallback(
    (path: string) => {
      const depth: number | undefined = history.state?.fileDepth;
      showFile(path, depth ? depth + 1 : undefined);
    },
    [showFile],
  );

  const added = useMemo(
    () =>
      sortChanges(
        pr.changes.filter(c => c.kind === 'added'),
        sort,
      ),
    [pr.changes, sort],
  );
  const updated = useMemo(
    () =>
      sortChanges(
        pr.changes.filter(c => c.kind === 'updated'),
        sort,
      ),
    [pr.changes, sort],
  );
  const shownAdded = filter === 'updated' ? NONE : added;
  const shownUpdated = filter === 'added' ? NONE : updated;
  // Order on screen, for [ and ] in the file view
  const navChanges = useMemo(() => [...shownAdded, ...shownUpdated], [shownAdded, shownUpdated]);

  // Go back to the grid's own entry, so Forward can reopen the files
  const closeFile = useCallback(() => {
    const depth: number | undefined = history.state?.fileDepth;
    if (depth) {
      history.go(-depth);
      return;
    }
    setOpenPath(null);
    if (prRef) history.replaceState(null, '', prSearch(prRef, null));
  }, [prRef]);

  const lowRateLimit = !token && rateLimit !== null && rateLimit.remaining < LOW_RATE_LIMIT;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header tokenInputOpen={tokenInputOpen} onTokenInputOpenChange={setTokenInputOpen} />

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8 sm:px-6 sm:py-10">
        {!prRef && (
          <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-[-0.02em] sm:text-[2.5rem] sm:leading-[1.1]">
              Review the icons in a pull request
            </h2>
            <p className="max-w-[60ch] text-base leading-relaxed text-muted-foreground">
              Paste a GitHub PR URL to preview its new SVGs and compare updated ones before and after. Files are read
              straight from GitHub in your browser.
            </p>
          </div>
        )}

        <PrUrlInput
          value={input}
          onChange={setInput}
          onSubmit={submit}
          onInvalid={rejectInput}
          error={inputError}
          loading={pr.loading}
        />

        {/* The error box explains the limit itself, so the banner steps aside while it shows */}
        {lowRateLimit && !(prRef && pr.error) && (
          <div className={`flex flex-wrap items-center gap-2 ${NOTICE_WARNING}`} role="status">
            <TriangleAlert className="h-4 w-4 text-warning" />
            Only {rateLimit.remaining} GitHub API requests left this hour (each PR needs 3 or more). Resets at{' '}
            {new Date(rateLimit.reset * 1000).toLocaleTimeString()}.
            <button
              onClick={() => setTokenInputOpen(true)}
              className="font-semibold underline decoration-input underline-offset-4 hover:decoration-foreground"
            >
              {GITHUB_SIGN_IN_ENABLED ? 'Sign in with GitHub or add a token' : 'Add a token'}
            </button>
          </div>
        )}

        {/* Results belong to the PR being shown: none while the input is rejected */}
        {!prRef || pr.inputError ? null : pr.error ? (
          <ErrorState
            title="Error loading pull request"
            error={pr.error}
            onRetry={pr.reload}
            onAddToken={() => setTokenInputOpen(true)}
          />
        ) : pr.loading ? (
          <SkeletonGrid message="Loading the pull request from GitHub…" />
        ) : (
          pr.info && (
            <>
              <PrSummary info={pr.info} />
              <PrCaseTabs
                active={filter}
                counts={{ all: pr.changes.length, added: added.length, updated: updated.length }}
                onChange={setFilter}
                sort={sort}
                onSortChange={setSort}
                thumbSize={thumbSize}
                onThumbSizeChange={setThumbSize}
              />
              {pr.truncated && (
                <p className={NOTICE_WARNING}>
                  This PR changes more than {MAX_PR_FILES} files. GitHub only lists the first {MAX_PR_FILES}, so some
                  SVGs may be missing.
                </p>
              )}
              {navChanges.length === 0 && <p className={EMPTY_STATE}>{EMPTY_MESSAGE[filter]}</p>}
              <PrFileGrid
                title="Added"
                changes={shownAdded}
                thumbSize={thumbSize}
                fileErrors={pr.fileErrors}
                loadFile={pr.loadFile}
                onOpen={openFile}
              />
              <PrFileGrid
                title="Updated"
                changes={shownUpdated}
                thumbSize={thumbSize}
                fileErrors={pr.fileErrors}
                loadFile={pr.loadFile}
                onOpen={openFile}
              />
              {pr.otherCount > 0 && (
                <p className="border-t border-border pt-4 text-xs text-muted-foreground">
                  {pr.otherCount} other SVG change{pr.otherCount === 1 ? '' : 's'} not shown (removed or renamed without
                  changes)
                </p>
              )}
            </>
          )
        )}
      </main>

      {pr.info && openPath && (
        <PrFileView
          info={pr.info}
          changes={navChanges}
          allChanges={pr.changes}
          path={openPath}
          fileErrors={pr.fileErrors}
          loadFile={pr.loadFile}
          fetchBaseFile={pr.fetchBaseFile}
          onNavigate={stepFile}
          onClose={closeFile}
        />
      )}
    </div>
  );
}
