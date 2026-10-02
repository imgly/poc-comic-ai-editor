/**
 * Generates several variants of one prompt in parallel and hands each one to the caller as it
 * arrives. What happens with a variant is up to the caller: the Background panel puts it on the
 * page (engine/backgroundVariants.ts), the Create Object panel lists it as a thumbnail
 * (engine/objectVariants.ts).
 */
import { getImageAI } from './gateway';

export type Variant = { uri: string; blob: Blob; index: number };

export type GenerateVariantsOptions = {
  model: string;
  prompt: string;
  ratio: string;
  count: number;
  /** Reference image sent with every request (uploaded once). */
  reference?: Blob;
  /** Results without a background (native option or background removal). */
  transparent?: boolean;
  /** Called with each variant as it arrives. */
  onVariant: (variant: Variant) => void | Promise<void>;
  /** Called after each request has finished, with the counts so far. */
  onProgress?: (done: number, failed: number) => void;
};

/** Runs that are in flight, so they can be cancelled as a group. */
const active = new Set<AbortController>();

/** Resolves when all requests have finished, with the first error message, if any. */
export async function generateVariants(opts: GenerateVariantsOptions): Promise<string | null> {
  const ai = await getImageAI();
  const imageUrl = opts.reference ? await ai.uploadImage(opts.reference) : undefined;
  let done = 0;
  let failed = 0;
  let firstError: string | null = null;
  const seed = Date.now() % 1000;
  const controller = new AbortController();
  active.add(controller);
  await Promise.all(
    Array.from({ length: opts.count }, async (_, index) => {
      try {
        const blob = await ai.generate({ model: opts.model, prompt: opts.prompt, ratio: opts.ratio, imageUrl, transparent: opts.transparent, seed: seed + index, signal: controller.signal });
        // Cancelled while the request ran: the editor is gone, nothing may be written into it.
        if (controller.signal.aborted) return;
        await opts.onVariant({ uri: URL.createObjectURL(blob), blob, index });
        done++;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        failed++;
        firstError ??= (err as Error).message ?? String(err);
        console.warn('[variants]', err);
      }
      if (!controller.signal.aborted) opts.onProgress?.(done, failed);
    })
  );
  active.delete(controller);
  return firstError;
}

/** Cancels every running generation; called when the editor is torn down. */
export function abortAllGenerations(): void {
  active.forEach((controller) => controller.abort());
  active.clear();
}
