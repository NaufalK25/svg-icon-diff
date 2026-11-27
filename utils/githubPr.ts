import type { PrSvgChange, PullRequestInfo } from '@/types/diff';
import type { GitHubRateLimit } from '@/types/icon';

const API = 'https://api.github.com';
const RAW = 'https://raw.githubusercontent.com';
const PER_PAGE = 100;
/** GitHub's /pulls/{n}/files lists at most this many files */
export const MAX_PR_FILES = 3000;

export interface PrRef {
  owner: string;
  repo: string;
  number: number;
}

/**
 * Accepts https://github.com/owner/repo/pull/1234 (with or without the scheme, and with
 * a trailing /files, #fragment or ?query) and the short form owner/repo#1234.
 */
export function parsePrUrl(input: string): PrRef | null {
  const text = input.trim();
  const url = text.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)(?:[/?#].*)?$/i);
  const short = text.match(/^([\w.-]+)\/([\w.-]+)#(\d+)$/);
  const m = url ?? short;
  if (!m) return null;
  return { owner: m[1], repo: m[2], number: Number(m[3]) };
}

/** An issue link (https://github.com/owner/repo/issues/1234), so the input can say it's not a pull request */
export function parseIssueUrl(input: string): PrRef | null {
  const m = input
    .trim()
    .match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)\/issues\/(\d+)(?:[/?#].*)?$/i);
  return m ? { owner: m[1], repo: m[2], number: Number(m[3]) } : null;
}

/** Error text for a number that is an issue, shared by the input check and the API check */
export const notAPullRequest = ({ owner, repo, number }: PrRef) =>
  `${owner}/${repo}#${number} is an issue, not a pull request.`;

const FORMATS = 'Use https://github.com/owner/repo/pull/1234 or owner/repo#1234.';

export function prInputError(issue: PrRef | null): string {
  return `${issue ? notAPullRequest(issue) : 'Not a pull request URL.'} ${FORMATS}`;
}

/** Retrying won't help, so the page shows it under the input */
export class PrInputError extends Error {}

export function prUrl({ owner, repo, number }: PrRef): string {
  return `https://github.com/${owner}/${repo}/pull/${number}`;
}

function headersFor(token?: string, accept = 'application/vnd.github.v3+json'): Record<string, string> {
  const headers: Record<string, string> = { Accept: accept };
  if (token) headers['Authorization'] = `token ${token}`;
  return headers;
}

function rateLimitOf(res: Response): GitHubRateLimit | null {
  const remaining = res.headers.get('x-ratelimit-remaining');
  if (remaining === null) return null;
  return {
    remaining: parseInt(remaining, 10),
    reset: parseInt(res.headers.get('x-ratelimit-reset') || '0', 10),
  };
}

type OnRateLimit = (limit: GitHubRateLimit) => void;

async function api<T>(path: string, token: string | undefined, onRateLimit: OnRateLimit): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: headersFor(token) });
  const limit = rateLimitOf(res);
  if (limit) onRateLimit(limit);
  if (!res.ok) {
    // ErrorState looks for "403" / "rate limit" to explain the limit and the token
    const body: { message?: string } = await res.json().catch(() => ({}));
    const hint = res.status === 404 && !token ? ' (a private repository needs a token)' : '';
    throw new Error(`GitHub ${res.status}: ${body.message || res.statusText}${hint}`);
  }
  return res.json() as Promise<T>;
}

interface GhPull {
  title: string;
  state: 'open' | 'closed';
  merged_at: string | null;
  user: { login: string } | null;
  changed_files: number;
  base: { sha: string; repo: { full_name: string } };
  head: { sha: string; repo: { full_name: string } | null };
}

interface GhFile {
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  changes: number;
  previous_filename?: string;
}

export interface PullRequestData {
  info: PullRequestInfo;
  changes: PrSvgChange[];
  /** SVG changes with nothing to preview: removed, renamed without changes, … */
  otherCount: number;
  /** The PR has more files than GitHub lists (MAX_PR_FILES) */
  truncated: boolean;
}

/** Sort a PR file into the added or updated case, or null when there is nothing to preview */
function toChange(file: GhFile): PrSvgChange | null {
  if (file.status === 'added') return { kind: 'added', path: file.filename, after: null };
  if (file.status === 'modified') return { kind: 'updated', path: file.filename, before: null, after: null };
  if (file.status === 'renamed' && file.changes > 0) {
    return { kind: 'updated', path: file.filename, previousPath: file.previous_filename, before: null, after: null };
  }
  return null;
}

/**
 * Load a PR's metadata and its SVG files (without their contents): the PR,
 * its merge base, and every page of the file list, i.e. 3+ API calls.
 */
export async function fetchPullRequest(
  ref: PrRef,
  token: string | undefined,
  onRateLimit: OnRateLimit,
): Promise<PullRequestData> {
  const base = `/repos/${ref.owner}/${ref.repo}`;
  let pull: GhPull;
  try {
    pull = await api<GhPull>(`${base}/pulls/${ref.number}`, token, onRateLimit);
  } catch (err) {
    // Issues and pull requests share numbers: a 404 here may just mean the number is an issue
    // (owner/repo#1234 can be either). One more call tells them apart
    if (err instanceof Error && err.message.startsWith('GitHub 404')) {
      const issue = await api<{ pull_request?: unknown }>(`${base}/issues/${ref.number}`, token, onRateLimit).catch(
        (e: unknown) => (e instanceof Error && e.message.startsWith('GitHub 404') ? 'missing' : null),
      );
      if (issue && issue !== 'missing' && !issue.pull_request) throw new PrInputError(prInputError(ref));
      if (issue === 'missing') {
        const hint = token ? '' : ' A private repository needs a token.';
        throw new PrInputError(
          `No pull request ${ref.owner}/${ref.repo}#${ref.number}. Check the repository and number.${hint}`,
        );
      }
    }
    throw err;
  }

  // "Files changed" diffs against the merge base, not the base branch tip, so
  // later commits on the base branch stay out of the review
  const compare = await api<{ merge_base_commit: { sha: string } }>(
    `${base}/compare/${pull.base.sha}...${pull.head.sha}`,
    token,
    onRateLimit,
  );

  const files: GhFile[] = [];
  for (let page = 1; files.length < MAX_PR_FILES; page++) {
    const batch = await api<GhFile[]>(
      `${base}/pulls/${ref.number}/files?per_page=${PER_PAGE}&page=${page}`,
      token,
      onRateLimit,
    );
    files.push(...batch);
    if (batch.length < PER_PAGE) break;
  }

  const svgs = files.filter(f => f.filename.toLowerCase().endsWith('.svg'));
  const changes = svgs.map(toChange).filter((c): c is PrSvgChange => c !== null);

  return {
    info: {
      owner: ref.owner,
      repo: ref.repo,
      number: ref.number,
      title: pull.title,
      author: pull.user?.login ?? 'ghost',
      state: pull.merged_at ? 'merged' : pull.state,
      baseSha: pull.base.sha,
      mergeBaseSha: compare.merge_base_commit.sha,
      headSha: pull.head.sha,
      // A deleted fork has no head repo; its commits stay reachable by SHA in the base repo
      headRepo: pull.head.repo?.full_name ?? pull.base.repo.full_name,
    },
    changes,
    otherCount: svgs.length - changes.length,
    truncated: files.length >= MAX_PR_FILES || pull.changed_files > files.length,
  };
}

const encodePath = (path: string) => path.split('/').map(encodeURIComponent).join('/');

/** raw.githubusercontent URL of a file at a commit: CORS-enabled and outside the API rate limit */
export function rawUrl(repo: string, sha: string, path: string): string {
  return `${RAW}/${repo}/${sha}/${encodePath(path)}`;
}

export function blobUrl(repo: string, sha: string, path: string): string {
  return `https://github.com/${repo}/blob/${sha}/${encodePath(path)}`;
}

/**
 * A file's content at a commit. Tries raw.githubusercontent first (free); a
 * private repo 404s there, so with a token it falls back to the contents API.
 */
export async function fetchFile(
  repo: string,
  sha: string,
  path: string,
  token: string | undefined,
  onRateLimit: OnRateLimit,
): Promise<string> {
  const res = await fetch(rawUrl(repo, sha, path));
  if (res.ok) return res.text();
  if (!token) throw new Error(`Failed to fetch ${path}: HTTP ${res.status}`);

  console.warn(`[fetchFile] raw ${res.status} for ${path}, falling back to the contents API`);
  const api = await fetch(`${API}/repos/${repo}/contents/${encodePath(path)}?ref=${sha}`, {
    headers: headersFor(token, 'application/vnd.github.raw'),
  });
  const limit = rateLimitOf(api);
  if (limit) onRateLimit(limit);
  if (!api.ok) throw new Error(`Failed to fetch ${path}: GitHub ${api.status}`);
  return api.text();
}

/** Run at most `max` tasks at once; the rest wait their turn in order */
export function createLimiter(max: number) {
  let active = 0;
  const queue: (() => void)[] = [];
  const next = () => {
    if (active >= max) return;
    const start = queue.shift();
    if (start) start();
  };
  return function limit<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        active++;
        task()
          .then(resolve, reject)
          .finally(() => {
            active--;
            next();
          });
      });
      next();
    });
  };
}
