import { NextResponse } from 'next/server';
import { SESSION_COOKIE, bypassPageAuth, hasAccountSession } from './app/_lib/access';
import { loginDestination } from './app/_lib/login-destination';

export async function proxy(request) {
  const { pathname, search } = request.nextUrl;
  if (bypassPageAuth(pathname)) return NextResponse.next();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const signedIn = await hasAccountSession(token, process.env.STUDIO_API_ORIGIN || 'https://api.snowlink.team');
  let response;
  if (signedIn) response = NextResponse.next();
  else {
    const destination = new URL('/login', request.url);
    destination.searchParams.set('next', loginDestination(pathname + search));
    response = NextResponse.redirect(destination);
  }
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image).*)'] };
