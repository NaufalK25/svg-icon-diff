// Server only: reads the OAuth app's client secret. Never import this from a client component.

export const STATE_COOKIE = 'gh_oauth_state';
export const RETURN_COOKIE = 'gh_oauth_return';
/** Cookies live only for the round trip to GitHub and back */
export const COOKIE_MAX_AGE = 10 * 60;
export const COOKIE_PATH = '/api/auth';

/** Scope for public data only: no scope gives read access to public repos and the 5000/hour limit */
export const PUBLIC_SCOPE = '';
/** Private repos can only be read with the full `repo` scope (GitHub has no read-only variant) */
export const PRIVATE_SCOPE = 'repo';

export function oauthConfig(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export const callbackUrl = (origin: string) => `${origin}/api/auth/callback`;

/** Only same-site paths, so the login can't be used to redirect somewhere else */
export function safeReturnPath(path: string | null | undefined): string {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return '/';
  return path;
}

/**
 * Back to the page the login started from. The result rides in the URL fragment,
 * which browsers never send to a server, so the token doesn't reach any logs.
 */
export function returnUrl(origin: string, path: string, fragment: Record<string, string>): string {
  const url = new URL(path, origin);
  url.hash = new URLSearchParams(fragment).toString();
  return url.toString();
}
