/**
 * Checks the site password and starts a session (see `src/lib/sitePassword.ts`).
 * The cookie is httpOnly, so page scripts cannot read it.
 */
import { NextResponse } from 'next/server';
import { isCorrectPassword, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, sessionToken } from '@/lib/sitePassword';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!(await isCorrectPassword(password))) {
    // A small hurdle against casual guessing. It is no rate limit: put one in front of this
    // route for anything beyond a private demo.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, await sessionToken(password), {
    httpOnly: true,
    // Secure whenever the site is served over https (always the case on Vercel).
    secure: (request.headers.get('x-forwarded-proto') ?? new URL(request.url).protocol).startsWith('https'),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
