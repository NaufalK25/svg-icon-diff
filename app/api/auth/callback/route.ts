import { type NextRequest, NextResponse } from 'next/server';

import {
  callbackUrl,
  COOKIE_PATH,
  oauthConfig,
  RETURN_COOKIE,
  returnUrl,
  safeReturnPath,
  STATE_COOKIE,
} from '@/app/api/auth/oauth';

/** GitHub sends the user back here with a one-time code, which is swapped for a token using the client secret */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const returnTo = safeReturnPath(request.cookies.get(RETURN_COOKIE)?.value);
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;

  const done = (fragment: Record<string, string>) => {
    const response = NextResponse.redirect(returnUrl(origin, returnTo, fragment));
    response.cookies.delete({ name: STATE_COOKIE, path: COOKIE_PATH });
    response.cookies.delete({ name: RETURN_COOKIE, path: COOKIE_PATH });
    return response;
  };

  const config = oauthConfig();
  if (!config) return done({ gh_auth_error: 'GitHub sign-in is not configured on this server' });

  // The user pressed Cancel on GitHub's consent page
  const denied = searchParams.get('error');
  if (denied) return done({ gh_auth_error: searchParams.get('error_description') || denied });

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  if (!code || !state || !expectedState || state !== expectedState) {
    return done({ gh_auth_error: 'Sign-in expired or was started elsewhere. Try again.' });
  }

  try {
    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: callbackUrl(origin),
      }),
    });
    const data: { access_token?: string; error?: string; error_description?: string } = await res.json();
    if (!data.access_token) {
      return done({ gh_auth_error: data.error_description || data.error || `GitHub ${res.status}` });
    }
    return done({ gh_token: data.access_token });
  } catch (err) {
    return done({ gh_auth_error: `Could not reach GitHub: ${err instanceof Error ? err.message : String(err)}` });
  }
}
