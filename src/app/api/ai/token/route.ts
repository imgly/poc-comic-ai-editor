/**
 * Mints a short-lived IMG.LY AI Gateway token for the browser. The gateway API key stays on the
 * server. Answers `{ configured: false }` when no key is set so the editor falls back to mock
 * generation (a 2xx on purpose so demos stay free of console errors). Behind the password gate
 * (`src/proxy.ts`) when `SITE_PASSWORD` is set; add your own authentication for production.
 */
const GATEWAY_URL = process.env.IMGLY_AI_GATEWAY_URL || 'https://gateway.img.ly';

export async function POST() {
  const apiKey = process.env.IMGLY_AI_GATEWAY_API_KEY;
  if (!apiKey) return Response.json({ configured: false });

  const res = await fetch(`${GATEWAY_URL}/v1/tokens`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sub: 'comic-poc-user' }),
  }).catch(() => null);
  if (!res) return Response.json({ error: 'gateway not reachable' }, { status: 502 });
  if (!res.ok) return Response.json({ error: `gateway token request failed (${res.status})` }, { status: 502 });
  const { token } = (await res.json()) as { token: string };
  return Response.json({ token, gatewayUrl: GATEWAY_URL });
}
