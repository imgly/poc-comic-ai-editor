/**
 * Generates N variants for a prompt and publishes them as assets of a local asset source, so the
 * stock asset library component renders them as clickable thumbnails inside a panel.
 */
import type CreativeEditorSDK from '@cesdk/cesdk-js';
import { getImageAI, type Capability, type ImageModel } from './ai/gateway';

export type VariantSet = { sourceId: string; entryId: string };

/** Registers (once) a local source plus the library entry that shows it. */
export function ensureVariantSet(cesdk: CreativeEditorSDK, key: string): VariantSet {
  const sourceId = `comic.variants.${key}`;
  const entryId = `comic.variants.entry.${key}`;
  const { engine } = cesdk;
  if (!engine.asset.findAllSources().includes(sourceId)) {
    engine.asset.addLocalSource(sourceId, ['image/png', 'image/jpeg', 'image/webp']);
    cesdk.ui.addAssetLibraryEntry({
      id: entryId,
      sourceIds: [sourceId],
      gridColumns: 2,
      gridItemHeight: 'auto',
      gridBackgroundType: 'cover',
      previewLength: 4,
      canAdd: false,
      canRemove: false,
    });
  }
  return { sourceId, entryId };
}

/**
 * Empties the source. The images themselves are left alone: a variant from an earlier run may be
 * in use as a block's fill, so its blob URL must stay valid.
 */
function clearSource(cesdk: CreativeEditorSDK, sourceId: string): void {
  const { engine } = cesdk;
  engine.asset
    .findAssets(sourceId, { page: 0, perPage: 100 })
    .then((result) => result.assets.forEach((asset) => engine.asset.removeAssetFromSource(sourceId, asset.id)))
    .catch(() => undefined);
}

async function imageSize(blob: Blob): Promise<{ width: number; height: number }> {
  const bmp = await createImageBitmap(blob);
  const size = { width: bmp.width, height: bmp.height };
  bmp.close();
  return size;
}

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
  onVariant?: (uri: string, index: number) => void;
  /** Called after each variant is added, with the number of finished requests. */
  onProgress?: (done: number, failed: number) => void;
};

/**
 * Generates the variants in parallel. With a variant set, its assets are replaced by the fresh
 * variants, added as they arrive so the library fills up one tile at a time; without one the
 * caller takes them from `onVariant`. Resolves with the first error message, if any.
 */
export async function generateVariants(cesdk: CreativeEditorSDK, set: VariantSet | null, opts: GenerateVariantsOptions): Promise<string | null> {
  const ai = await getImageAI();
  if (set) clearSource(cesdk, set.sourceId);
  const imageUrl = opts.reference ? await ai.uploadImage(opts.reference) : undefined;
  let done = 0;
  let failed = 0;
  let firstError: string | null = null;
  const stamp = Date.now();
  // Abortable as a group, so an editor teardown (or a page reload during development) cancels
  // the in-flight requests instead of writing into a disposed engine.
  const controller = new AbortController();
  active.add(controller);
  await Promise.all(
    Array.from({ length: opts.count }, async (_, i) => {
      try {
        const blob = await ai.generate({ model: opts.model, prompt: opts.prompt, ratio: opts.ratio, imageUrl, transparent: opts.transparent, seed: stamp % 1000 + i, signal: controller.signal });
        if (controller.signal.aborted || !cesdk.engine) return;
        const uri = URL.createObjectURL(blob);
        if (set) {
          const { width, height } = await imageSize(blob);
          if (controller.signal.aborted || !cesdk.engine) return;
          cesdk.engine.asset.addAssetToSource(set.sourceId, {
            id: `${stamp}-${i}`,
            label: { en: `Variant ${i + 1}` },
            meta: { uri, thumbUri: uri, kind: 'image', fillType: '//ly.img.ubq/fill/image', width, height, mimeType: blob.type || 'image/png' },
          });
        }
        opts.onVariant?.(uri, i);
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

const active = new Set<AbortController>();

/** Cancels every running generation; called when the editor is torn down. */
export function abortAllGenerations(): void {
  active.forEach((c) => c.abort());
  active.clear();
}

const modelPromises = new Map<Capability, Promise<ImageModel[]>>();

/** Cached model list per capability; the caller re-renders when it resolves. A failure is not cached. */
export function loadModels(capability: Capability): Promise<ImageModel[]> {
  let p = modelPromises.get(capability);
  if (!p) {
    p = getImageAI().then((ai) => ai.listModels(capability));
    p.catch(() => modelPromises.delete(capability));
    modelPromises.set(capability, p);
  }
  return p;
}
