/**
 * Password gate. Next.js runs this before every matched request (the file convention is called
 * "proxy" since Next.js 16, formerly "middleware").
 *
 * With `SITE_PASSWORD` set, every page and API route needs the session cookie that `/api/login`
 * hands out. That includes `/api/ai/token`, so nobody can mint AI Gateway tokens without the
 * password. Pages redirect to `/login`, API routes answer 401.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { isValidSession, SESSION_COOKIE, sitePassword } from '@/lib/sitePassword';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const home = () => NextResponse.redirect(new URL('/', request.url));

  // No password configured: the site is open and the login page has no purpose.
  if (sitePassword() === null) return pathname === '/login' ? home() : NextResponse.next();

  if (await isValidSession(request.cookies.get(SESSION_COOKIE)?.value)) return pathname === '/login' ? home() : NextResponse.next();

  if (pathname === '/login' || pathname === '/api/login') return NextResponse.next();
  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  // Everything except Next.js' own static files.
  matcher: ['/((?!_next/|favicon.ico).*)'],
};
