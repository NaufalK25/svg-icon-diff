import { oauthConfig } from '@/app/api/auth/oauth';

/**
 * Revoke a token from GitHub sign-in, so signing out also ends its access on
 * GitHub's side (it shows up under Settings → Applications until then).
 * Needs the client secret, hence a server route. Best effort: the browser
 * forgets the token either way.
 */
export async function POST(request: Request) {
  const config = oauthConfig();
  if (!config) return Response.json({ revoked: false }, { status: 501 });

  const body: { token?: unknown } = await request.json().catch(() => ({}));
  if (typeof body.token !== 'string' || !body.token) return Response.json({ revoked: false }, { status: 400 });

  const basic = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const res = await fetch(`https://api.github.com/applications/${config.clientId}/token`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ access_token: body.token }),
  });
  // 404: already revoked, or not a token of this app (e.g. a pasted personal token)
  return Response.json({ revoked: res.status === 204 }, { status: res.status === 204 ? 200 : res.status });
}
