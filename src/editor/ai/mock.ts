/**
 * Mock image generation, used when the server has no AI Gateway key (`/api/ai/token` answers
 * `configured: false`). Images are drawn locally on a canvas, so the whole workflow can be clicked
 * through without a key and without cost. Delete this file and its use in gateway.ts once a key
 * is always present.
 */
import { parseRatio, type GenerateRequest, type ImageAI, type ImageModel } from './gateway';

/**
 * Draws a placeholder: a hue picked from the seed, the prompt as caption, the reference as a corner
 * thumbnail; a cut-out shape when transparency is requested.
 */
async function mockImage(req: GenerateRequest, seed: number): Promise<Blob> {
  const r = parseRatio(req.ratio);
  const width = 1024;
  const height = Math.round(width / r);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const hue = (seed * 67) % 360;
  if (req.transparent) {
    // A cut-out: a blob-shaped "object" on a fully transparent canvas.
    ctx.fillStyle = `hsl(${hue} 55% 55%)`;
    ctx.beginPath();
    ctx.ellipse(width / 2, height * 0.55, width * 0.28, height * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `hsl(${(hue + 40) % 360} 60% 40%)`;
    ctx.fillRect(width * 0.36, height * 0.72, width * 0.28, height * 0.2);
    ctx.fillStyle = '#fff';
    ctx.font = '600 28px system-ui, sans-serif';
    ctx.fillText(`Mock ${seed}`, width * 0.4, height * 0.58);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'));
  }
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, `hsl(${hue} 55% 62%)`);
  grad.addColorStop(1, `hsl(${(hue + 50) % 360} 60% 38%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (let i = 0; i < 6; i++) {
    const s = 80 + ((seed * 31 + i * 97) % 220);
    ctx.beginPath();
    ctx.arc((seed * 131 + i * 211) % width, (seed * 71 + i * 173) % height, s, 0, Math.PI * 2);
    ctx.fill();
  }
  if (req.imageUrl) {
    try {
      const bmp = await createImageBitmap(await (await fetch(req.imageUrl)).blob());
      const tw = Math.round(width * 0.28);
      const th = Math.round((tw * bmp.height) / bmp.width);
      ctx.drawImage(bmp, width - tw - 24, 24, tw, th);
      bmp.close();
    } catch {
      /* reference thumbnail is decoration only */
    }
  }
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, height - 92, width, 92);
  ctx.fillStyle = '#fff';
  ctx.font = '600 30px system-ui, sans-serif';
  ctx.fillText(`Mock ${seed} · ${req.prompt.slice(0, 60)}${req.prompt.length > 60 ? '…' : ''}`, 28, height - 38);
  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'));
}

/** Stands in for the gateway when no API key is configured. */
export function mockAI(): ImageAI {
  const models: ImageModel[] = [
    { id: 'mock/comic', name: 'Mock generator (no gateway key)', creator: 'local' },
    { id: 'mock/comic-fast', name: 'Mock generator · fast', creator: 'local' },
  ];
  return {
    listModels: async () => models,
    uploadImage: async (blob) => URL.createObjectURL(blob),
    async generate(req) {
      const delay = req.model.endsWith('fast') ? 400 : 1400 + Math.random() * 800;
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(resolve, delay);
        req.signal?.addEventListener('abort', () => {
          clearTimeout(t);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
      return await mockImage(req, req.seed ?? 1);
    },
  };
}
