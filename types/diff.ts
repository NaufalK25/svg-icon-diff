import type { GitHubRateLimit, SVGMetadata } from '@/types/icon';

export type SvgSource =
  { kind: 'upload'; fileName: string } | { kind: 'paste' } | { kind: 'pr'; repo: string; ref: string; path: string };

export interface SvgItem {
  id: string;
  name: string;
  content: string;
  source: SvgSource;
  metadata?: SVGMetadata;
}

export type CompareMode = 'swipe' | 'difference' | 'onion' | 'blink' | 'side' | 'overprint';
export type Background = 'dark' | 'light' | 'checker';
/** Pixel size the icon is rasterized at, or 'fit' to draw the vector at the stage size */
export type RenderSize = 16 | 24 | 32 | 64 | 'fit';

export interface PixelDiffResult {
  changed: number;
  total: number;
  /** Bounding box of changed pixels in canvas px; null when nothing changed */
  bbox: { x: number; y: number; width: number; height: number } | null;
  image: ImageData;
}

/** The two PR cases. Content fields are null until fetched. */
export type PrSvgChange =
  | {
      kind: 'added';
      path: string;
      after: string | null;
    }
  | {
      kind: 'updated';
      path: string;
      /** Set when GitHub reports a rename with content changes */
      previousPath?: string;
      before: string | null;
      after: string | null;
      diff?: PixelDiffResult;
    };

export interface PullRequestInfo {
  owner: string;
  repo: string;
  number: number;
  title: string;
  author: string;
  state: 'open' | 'closed' | 'merged';
  baseSha: string;
  mergeBaseSha: string;
  headSha: string;
  /** "owner/repo" of the head branch, which differs from the base repo for forks */
  headRepo: string;
}

/** The account behind a token from GitHub sign-in */
export interface GitHubUser {
  login: string;
  avatarUrl: string;
}

export interface AppContextType {
  theme: 'dark' | 'light';
  token: string;
  /** Set when the token came from GitHub sign-in rather than being pasted */
  authUser: GitHubUser | null;
  /** Why the last sign-in failed, until dismissed */
  authError: string | null;
  rateLimit: GitHubRateLimit | null;
  /** Uploaded and pasted icons, in tray order */
  items: SvgItem[];
  /** The base icon (A) */
  baseId: string | null;
  /** The icon compared against the base (B) */
  compareId: string | null;
  setTheme: (theme: 'dark' | 'light') => void;
  /** A pasted personal access token; replaces any signed-in session */
  setToken: (token: string) => void;
  /** Go to GitHub to sign in, then come back to the current page */
  signIn: (options?: { includePrivate?: boolean }) => void;
  /** Forget the token (and revoke it on GitHub when it came from sign-in) */
  signOut: () => void;
  clearAuthError: () => void;
  setRateLimit: (limit: GitHubRateLimit | null) => void;
  /** Add icons; one with the same name as an existing icon replaces it and keeps its id */
  addItems: (items: Omit<SvgItem, 'id'>[]) => void;
  removeItem: (id: string) => void;
  clearItems: () => void;
  setBaseId: (id: string) => void;
  setCompareId: (id: string) => void;
  swap: () => void;
}
