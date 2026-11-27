'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAppContext } from '@/context/AppContext';
import type { PrSvgChange, PullRequestInfo } from '@/types/diff';
import { folderVariantPath } from '@/utils/folderLint';
import {
  createLimiter,
  fetchFile,
  fetchPullRequest,
  FileNotFoundError,
  PrInputError,
  type PrRef,
} from '@/utils/githubPr';
import { DEFAULT_THRESHOLD, diffPixels } from '@/utils/pixelDiff';
import { rasterize } from '@/utils/rasterize';

/** Size the card badges' changed-pixel share is measured at: the explorer's native icon size */
export const BADGE_DIFF_SIZE = 32;

// Shared by every card so a large PR never has more than 6 downloads in flight
const limit = createLimiter(6);

export interface PullRequestState {
  info: PullRequestInfo | null;
  changes: PrSvgChange[];
  otherCount: number;
  truncated: boolean;
  loading: boolean;
  /** Retrying may fix it */
  error: string | null;
  /** Retrying won't help: an issue, or no such PR */
  inputError: string | null;
  /** Per-path download errors */
  fileErrors: Record<string, string>;
  /** Fetch a file's contents (and its pixel diff) if not fetched yet; cards call this once visible.
   *  `retry` fetches again after a failure. */
  loadFile: (path: string, retry?: boolean) => void;
  /** A file from the base side (merge base), e.g. to compare a new icon with an existing one */
  fetchBaseFile: (path: string) => Promise<string>;
  reload: () => void;
}

export function usePullRequest(ref: PrRef | null): PullRequestState {
  const { token, setRateLimit } = useAppContext();
  const [info, setInfo] = useState<PullRequestInfo | null>(null);
  const [changes, setChanges] = useState<PrSvgChange[]>([]);
  const [otherCount, setOtherCount] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [reloadKey, setReloadKey] = useState(0);
  const requested = useRef(new Set<string>());
  const refKey = ref ? `${ref.owner}/${ref.repo}#${ref.number}` : null;

  // Read the token through a ref: a token saved mid-review applies to the next
  // request without reloading the whole PR
  const tokenRef = useRef(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  // Loading state is reset before the request starts
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // No PR selected: back to idle. Without this, a run cancelled because the PR was cleared
    // would leave `loading` on forever, and its error would still be there when the same
    // PR is asked for again
    if (!ref) {
      setLoading(false);
      setError(null);
      setInputError(null);
      setInfo(null);
      setChanges([]);
      setFileErrors({});
      return;
    }
    let cancelled = false;
    requested.current = new Set();
    setLoading(true);
    setError(null);
    setInputError(null);
    setInfo(null);
    setChanges([]);
    setFileErrors({});
    /* eslint-enable react-hooks/set-state-in-effect */

    fetchPullRequest(ref, tokenRef.current || undefined, setRateLimit)
      .then(data => {
        if (cancelled) return;
        setInfo(data.info);
        setChanges(data.changes);
        setOtherCount(data.otherCount);
        setTruncated(data.truncated);
      })
      .catch(err => {
        if (cancelled) return;
        if (err instanceof PrInputError) setInputError(err.message);
        else setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refKey, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadFile = useCallback(
    (path: string, retry = false) => {
      if (!info || (requested.current.has(path) && !retry)) return;
      const change = changes.find(c => c.path === path);
      if (!change) return;
      requested.current.add(path);
      if (retry) {
        setFileErrors(({ [path]: _old, ...rest }) => rest);
      }

      const baseRepo = `${info.owner}/${info.repo}`;
      const get = (repo: string, sha: string, p: string) =>
        limit(() => fetchFile(repo, sha, p, tokenRef.current || undefined, setRateLimit));
      const update = (patch: Partial<PrSvgChange>) =>
        setChanges(prev => prev.map(c => (c.path === path ? ({ ...c, ...patch } as PrSvgChange) : c)));

      // A folder icon's other variant, for the overlay check; it may be outside the PR. Never rejects
      const variantOf = (repo: string, sha: string, p: string): Promise<string | null | undefined> => {
        const variantPath = folderVariantPath(p);
        if (!variantPath) return Promise.resolve(undefined);
        return get(repo, sha, variantPath).catch(err => (err instanceof FileNotFoundError ? null : undefined));
      };

      const work = async () => {
        const afterVariant = variantOf(info.headRepo, info.headSha, path);
        const after = await get(info.headRepo, info.headSha, path);
        if (change.kind === 'added') {
          update({ after, afterVariant: await afterVariant });
          return;
        }
        const beforePath = change.previousPath ?? path;
        const beforeVariant = variantOf(baseRepo, info.mergeBaseSha, beforePath);
        const before = await get(baseRepo, info.mergeBaseSha, beforePath);
        update({ before, after, beforeVariant: await beforeVariant, afterVariant: await afterVariant });
        try {
          const [a, b] = await Promise.all([rasterize(before, BADGE_DIFF_SIZE), rasterize(after, BADGE_DIFF_SIZE)]);
          update({ diff: diffPixels(a, b, DEFAULT_THRESHOLD) });
        } catch (err) {
          console.warn(
            `[usePullRequest] no pixel diff for ${path}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      };

      // Stays requested: only an explicit retry tries again, so a missing file isn't fetched in a loop
      work().catch(err => {
        setFileErrors(prev => ({ ...prev, [path]: err instanceof Error ? err.message : String(err) }));
      });
    },
    [info, changes, setRateLimit],
  );

  const fetchBaseFile = useCallback(
    (path: string) => {
      if (!info) return Promise.reject(new Error('Pull request not loaded'));
      return limit(() =>
        fetchFile(`${info.owner}/${info.repo}`, info.mergeBaseSha, path, tokenRef.current || undefined, setRateLimit),
      );
    },
    [info, setRateLimit],
  );

  const reload = useCallback(() => setReloadKey(k => k + 1), []);

  return {
    info,
    changes,
    otherCount,
    truncated,
    loading,
    error,
    inputError,
    fileErrors,
    loadFile,
    fetchBaseFile,
    reload,
  };
}
