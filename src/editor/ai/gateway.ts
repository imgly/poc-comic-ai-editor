/**
 * Image generation through the IMG.LY AI Gateway: text-to-image (backgrounds) and image-to-image
 * with a reference picture (objects, styled after the background).
 *
 * The browser never sees the gateway API key: `/api/ai/token` mints short-lived tokens. When that
 * endpoint reports no key (`configured: false`), a mock implementation (./mock.ts) draws
 * placeholder images locally so the whole workflow can still be demonstrated.
 */
import { createGatewayClient, type GatewayClient, type GatewaySchemaResult } from '@imgly/plugin-ai-generation-web';
import { mockAI } from './mock';

export type Capability = 'text2image' | 'image2image';

export type ImageModel = { id: string; name: string; creator?: string };

export type GenerateRequest = {
  model: string;
  prompt: string;
  /** Aspect ratio as "w:h", e.g. "16:9". Mapped to the closest ratio the model accepts. */
  ratio: string;
  /** Uploaded reference image (from `uploadImage`); required by image-to-image models. */
  imageUrl?: string;
  /**
   * Result without a background. Models with a native transparent-background option use it;
   * for every other model the result is run through the gateway's background-removal model.
   */
  transparent?: boolean;
  seed?: number;
  signal?: AbortSignal;
};

export type ImageAI = {
  /** Models of a capability. Image-to-image models are limited to those taking a prompt and an image. */
  listModels: (capability: Capability) => Promise<ImageModel[]>;
  /** Uploads a reference image and returns the URL to pass as `imageUrl`. */
  uploadImage: (blob: Blob) => Promise<string>;
  generate: (req: GenerateRequest) => Promise<Blob>;
};

export const DEFAULT_MODEL: Record<Capability, string> = {
  text2image: process.env.NEXT_PUBLIC_IMGLY_AI_DEFAULT_IMAGE_MODEL || 'bfl/flux-2-pro',
  image2image: process.env.NEXT_PUBLIC_IMGLY_AI_DEFAULT_EDIT_MODEL || 'google/nano-banana-2-edit',
};

/** Ratios every gateway image model accepts. Used when a model's schema lists no enum. */
const SAFE_RATIOS = ['1:1', '4:3', '16:9', '3:4', '9:16'];

type SchemaProps = Record<string, { type?: string; enum?: unknown[]; default?: unknown }>;

type ModelFields = {
  prompt: string | null;
  image: string | null;
  imageIsArray: boolean;
  ratio: string | null;
  hasSeed: boolean;
  /** Name of a field whose enum contains "transparent" (e.g. GPT Image's `background`). */
  transparentField: string | null;
};

/** The gateway's background-removal model; used to cut out objects from models without a native option. */
const REMOVE_BACKGROUND_MODEL = 'bria/rmbg-2.0';

const IMAGE_FIELD_NAMES = ['image_urls', 'image_url', 'image', 'images', 'input_image', 'input_images', 'reference_image_urls', 'reference_images'];

/** Works out which schema properties carry the prompt, the reference image(s) and the aspect ratio. */
function resolveFields(schema: GatewaySchemaResult): ModelFields {
  const props = (schema.input_schema?.properties ?? {}) as SchemaProps;
  const names = Object.keys(props);
  const prompt = names.find((n) => n === 'prompt') ?? names.find((n) => /prompt/i.test(n) && props[n].type === 'string') ?? null;
  const image = IMAGE_FIELD_NAMES.find((c) => names.includes(c)) ?? names.find((n) => /image/i.test(n) && !/mask|size|width|height|count|num|strength|format/i.test(n)) ?? null;
  const ratio = names.find((n) => /^(format|aspect_ratio|aspectRatio|aspect)$/i.test(n)) ?? names.find((n) => /aspect|format/i.test(n) && props[n].type !== 'object') ?? null;
  const transparentField = names.find((n) => (props[n].enum ?? []).includes('transparent')) ?? null;
  return { prompt, image, imageIsArray: image !== null && props[image]?.type === 'array', ratio, hasSeed: names.includes('seed'), transparentField };
}

async function fetchToken(): Promise<{ token: string; gatewayUrl: string } | null> {
  const res = await fetch('/api/ai/token', { method: 'POST' });
  // The site session ran out (see src/proxy.ts): a reload leads to the login page.
  if (res.status === 401) window.location.reload();
  if (!res.ok) throw new Error(`Token request failed (${res.status})`);
  const data = (await res.json()) as { configured?: boolean; token?: string; gatewayUrl?: string };
  if (data.configured === false || !data.token || !data.gatewayUrl) return null;
  return { token: data.token, gatewayUrl: data.gatewayUrl };
}

/** "16:9" → 1.78; 1 for anything that is not "w:h". */
export function parseRatio(r: string): number {
  const [w, h] = r.split(':').map(Number);
  return w && h ? w / h : 1;
}

/** The entry of `candidates` whose w:h value is closest to `ratio`. */
function closestRatio(ratio: string, candidates: string[]): string {
  const target = parseRatio(ratio);
  const valid = candidates.filter((c) => /^\d+:\d+$/.test(c));
  if (valid.length === 0) return ratio;
  return valid.reduce((best, c) => (Math.abs(Math.log(parseRatio(c) / target)) < Math.abs(Math.log(parseRatio(best) / target)) ? c : best));
}

/**
 * Builds the model input from its schema. `allowed` overrides the ratio candidates (used when the
 * gateway reported the valid values).
 */
function buildInput(schema: GatewaySchemaResult, req: GenerateRequest, allowed?: string[]): { input: Record<string, unknown>; ratioField: string | null; nativeTransparent: boolean } {
  const props = (schema.input_schema?.properties ?? {}) as SchemaProps;
  const fields = resolveFields(schema);
  const input: Record<string, unknown> = { [fields.prompt ?? 'prompt']: req.prompt };
  const nativeTransparent = Boolean(req.transparent && fields.transparentField);
  if (nativeTransparent && fields.transparentField) input[fields.transparentField] = 'transparent';
  if (fields.ratio) {
    const options = allowed ?? (props[fields.ratio].enum ?? []).filter((v): v is string => typeof v === 'string');
    input[fields.ratio] = closestRatio(req.ratio, options.length ? options : SAFE_RATIOS);
  }
  if (req.imageUrl && fields.image) input[fields.image] = fields.imageIsArray ? [req.imageUrl] : req.imageUrl;
  if (req.seed !== undefined && fields.hasSeed) input.seed = req.seed;
  return { input, ratioField: fields.ratio, nativeTransparent };
}

/** "Invalid format '5:4'. Valid values: 1:1, 4:3, 16:9" → ['1:1', '4:3', '16:9']. */
function validValuesFromError(message: string): string[] | null {
  const m = /Valid values:\s*([^"}\]]+)/i.exec(message);
  if (!m) return null;
  const values = m[1].split(/[,\s]+/).map((v) => v.trim()).filter(Boolean);
  return values.length ? values : null;
}

/**
 * Runs a generation and waits for the result URL. Written against the gateway's SSE stream directly
 * so the gateway's failure text reaches the panel.
 */
async function generateSSE(gatewayUrl: string, token: string, model: string, input: Record<string, unknown>, signal?: AbortSignal): Promise<string> {
  const res = await fetch(`${gatewayUrl}/v1/responses`, {
    method: 'POST',
    signal,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ model, ...input }),
  });
  if (!res.ok) throw new Error(`Gateway request failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  if (!res.body) throw new Error('Gateway response has no body');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const handle = (chunk: string): string | undefined => {
    const lines = chunk.split('\n');
    const event = lines.find((l) => l.startsWith('event:'))?.slice(6).trim();
    const data = lines.filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('');
    if (!event || !data) return undefined;
    if (event === 'generation.failed') {
      const parsed = JSON.parse(data) as { error?: string | { message?: string }; category?: string };
      const message = typeof parsed.error === 'string' ? parsed.error : parsed.error?.message ?? 'generation failed';
      throw new Error(message);
    }
    if (event === 'generation.completed') {
      const parsed = JSON.parse(data) as { output?: { url: string }[] };
      const url = parsed.output?.find((o) => o.url)?.url;
      if (!url) throw new Error('Generation completed without an output URL');
      return url;
    }
    return undefined;
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const url = handle(chunk);
      if (url) return url;
    }
  }
  const url = buffer.trim() ? handle(buffer) : undefined;
  if (url) return url;
  throw new Error('Gateway stream ended without a result');
}

async function download(url: string, signal?: AbortSignal): Promise<Blob> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Could not download the generated image (${res.status})`);
  return await res.blob();
}

let cached: Promise<ImageAI> | null = null;

/** One shared client per page load. */
export function getImageAI(): Promise<ImageAI> {
  cached ??= createImageAI().catch((err) => {
    cached = null;
    throw err;
  });
  return cached;
}

async function createImageAI(): Promise<ImageAI> {
  // Mock mode is for a server without a key only. A failing token request is an error and is
  // shown in the panels, so a wrong key or an outage never passes for mock mode.
  const first = await fetchToken();
  if (!first) return mockAI();

  const client: GatewayClient = createGatewayClient(first.gatewayUrl, async () => (await fetchToken())?.token ?? first.token);
  const schemas = new Map<string, Promise<GatewaySchemaResult>>();
  const schemaOf = (model: string) => {
    let p = schemas.get(model);
    if (!p) {
      p = client.fetchSchema(model);
      schemas.set(model, p);
    }
    return p;
  };
  const models = new Map<Capability, Promise<ImageModel[]>>();
  let grouped: Promise<Record<string, { id: string; name?: string; creator?: string }[] | undefined>> | null = null;
  const groupedModels = () => {
    grouped ??= (async () => {
      const token = (await fetchToken())?.token ?? first.token;
      const res = await fetch(`${first.gatewayUrl}/v1/models?groupBy=capability`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Could not list gateway models (${res.status})`);
      return (await res.json()) as Record<string, { id: string; name?: string; creator?: string }[] | undefined>;
    })();
    return grouped;
  };

  return {
    listModels(capability) {
      let p = models.get(capability);
      if (!p) {
        p = (async () => {
          const all = await groupedModels();
          // Raster models only: vector outputs cannot fill an image block. Background removal,
          // upscaling, inpainting and layer splitting are not "draw this from a reference".
          const candidates = (all[capability] ?? []).filter((m) => !/vector|rmbg|upscale|layerize|fill$/i.test(m.id));
          const list = (
            await Promise.all(
              candidates.map(async (m): Promise<ImageModel | null> => {
                if (capability === 'image2image') {
                  try {
                    const fields = resolveFields(await schemaOf(m.id));
                    if (!fields.prompt || !fields.image) return null;
                  } catch (err) {
                    console.warn('[ai] schema unavailable, model skipped', m.id, err);
                    return null;
                  }
                }
                return { id: m.id, name: m.name ?? m.id, creator: m.creator };
              })
            )
          ).filter((m): m is ImageModel => m !== null);
          if (list.length === 0) throw new Error(`The gateway key has no usable ${capability} models`);
          const preferred = DEFAULT_MODEL[capability];
          return list.sort((a, b) => (a.id === preferred ? -1 : b.id === preferred ? 1 : a.name.localeCompare(b.name)));
        })();
        models.set(capability, p);
      }
      return p;
    },
    async uploadImage(blob) {
      return (await client.upload(blob, blob.type || 'image/png')).asset_url;
    },
    async generate(req) {
      const schema = await schemaOf(req.model);
      const token = (await fetchToken())?.token ?? first.token;
      const built = buildInput(schema, req);
      let url: string;
      try {
        url = await generateSSE(first.gatewayUrl, token, req.model, built.input, req.signal);
      } catch (err) {
        // Some schemas omit the ratio enum; the gateway's validation error lists it. Retry once.
        const allowed = validValuesFromError((err as Error).message ?? '');
        const retry = allowed ? buildInput(schema, req, allowed) : null;
        if (!retry?.ratioField) throw err;
        url = await generateSSE(first.gatewayUrl, token, req.model, retry.input, req.signal);
      }
      const blob = await download(url, req.signal);
      if (!req.transparent || built.nativeTransparent) return blob;
      // No native option: cut the background out with the gateway's background-removal model.
      const uploaded = (await client.upload(blob, blob.type || 'image/png')).asset_url;
      const cutUrl = await generateSSE(first.gatewayUrl, token, REMOVE_BACKGROUND_MODEL, { image_urls: [uploaded] }, req.signal);
      return await download(cutUrl, req.signal);
    },
  };
}
