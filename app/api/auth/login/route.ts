import { type NextRequest, NextResponse } from 'next/server';

import {
  callbackUrl,
  COOKIE_MAX_AGE,
  COOKIE_PATH,
  oauthConfig,
  PRIVATE_SCOPE,
  PUBLIC_SCOPE,
  RETURN_COOKIE,
  returnUrl,
  safeReturnPath,
  STATE_COOKIE,
} from '@/app/api/auth/oauth';

/** Start GitHub sign-in: /api/auth/login?return=/pr?url=…&private=1 */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const returnTo = safeReturnPath(searchParams.get('return'));
  const config = oauthConfig();
  if (!config) {
    return NextResponse.redirect(
      returnUrl(origin, returnTo, { gh_auth_error: 'GitHub sign-in is not configured on this server' }),
    );
  }

  // Checked on the way back, so a callback can't be forged from another site
  const state = crypto.randomUUID();
  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', config.clientId);
  authorize.searchParams.set('redirect_uri', callbackUrl(origin));
  authorize.searchParams.set('scope', searchParams.get('private') === '1' ? PRIVATE_SCOPE : PUBLIC_SCOPE);
  authorize.searchParams.set('state', state);
  authorize.searchParams.set('allow_signup', 'false');

  const response = NextResponse.redirect(authorize);
  const cookie = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: COOKIE_PATH,
    maxAge: COOKIE_MAX_AGE,
  };
  response.cookies.set(STATE_COOKIE, state, cookie);
  response.cookies.set(RETURN_COOKIE, returnTo, cookie);
  return response;
}
