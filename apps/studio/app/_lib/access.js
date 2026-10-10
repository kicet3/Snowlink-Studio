export const SESSION_COOKIE = 'snowfall_session';

// API/media routes validate their own sessions on the backend. Only assets,
// machine-readable product descriptions and the sign-in screen bypass page auth.
export function bypassPageAuth(pathname) {
  return ['/login', '/logo.svg', '/favicon.ico', '/robots.txt', '/sitemap.xml', '/llms.txt', '/llms-full.txt', '/opengraph-image'].includes(pathname)
    || /^\/(?:api|integrations|media|renders|generated|showcase|studio-media\/fonts)(?:\/|$)/.test(pathname);
}

export async function hasAccountSession(token, apiOrigin, fetchImpl = fetch) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token || '')) return false;
  try {
    const response = await fetchImpl(new URL('/api/auth/session', apiOrigin), {
      headers: { Cookie: `${SESSION_COOKIE}=${token}` }, cache: 'no-store',
      redirect: 'error', signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return false;
    const { user } = await response.json();
    return !!user?.id && ['admin', 'member'].includes(user.role);
  } catch { return false; }
}
