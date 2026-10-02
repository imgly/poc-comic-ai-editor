/**
 * Simple password protection for the whole site (see `src/proxy.ts`).
 *
 * One shared password, set as the `SITE_PASSWORD` environment variable. Without it the site is
 * open, which is the default for local development. After a correct login the browser gets a
 * cookie holding a hash derived from the password, never the password itself. The hash is the
 * same for every visitor and stays valid until the password changes, which is also the way to end
 * all sessions.
 *
 * This is a gate for a private demo, not user management: there are no accounts and no roles.
 */

export const SESSION_COOKIE = 'comic_poc_session';

/** How long a login lasts. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** The configured password, or null when the site is open. */
export function sitePassword(): string | null {
  return process.env.SITE_PASSWORD || null;
}

/** The cookie value that proves knowledge of `password`. Web Crypto, so it runs in every runtime. */
export async function sessionToken(password: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`comic-poc-session:${password}`));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Compares without leaking, through timing, how many leading characters match. */
function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function isCorrectPassword(candidate: string): Promise<boolean> {
  const password = sitePassword();
  if (password === null) return true;
  // Compare the hashes, which have the same length whatever was typed.
  return sameString(await sessionToken(candidate), await sessionToken(password));
}

export async function isValidSession(cookie: string | undefined): Promise<boolean> {
  const password = sitePassword();
  if (password === null) return true;
  return cookie !== undefined && sameString(cookie, await sessionToken(password));
}
