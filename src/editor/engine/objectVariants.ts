/**
 * Object variants as thumbnails. Each object area gets a local asset source and an asset library
 * entry for it; the Create Object panel shows that entry with the stock `builder.Library`
 * component, so the variants look and behave like any other asset in CE.SDK.
 */
import type CreativeEditorSDK from '@cesdk/cesdk-js';
import type { Variant } from '../ai/generateVariants';

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
 * Empties the set before a new run. The images themselves are left alone: a variant from an
 * earlier run may be in use as a block's fill, so its blob URL must stay valid.
 */
export function clearVariantSet(cesdk: CreativeEditorSDK, set: VariantSet): void {
  const { engine } = cesdk;
  engine.asset
    .findAssets(set.sourceId, { page: 0, perPage: 100 })
    .then((result) => result.assets.forEach((asset) => engine.asset.removeAssetFromSource(set.sourceId, asset.id)))
    .catch(() => undefined);
}

let added = 0;

/** Adds a generated variant to the set; the library shows it right away. */
export async function addVariant(cesdk: CreativeEditorSDK, set: VariantSet, variant: Variant): Promise<void> {
  const bitmap = await createImageBitmap(variant.blob);
  const { width, height } = bitmap;
  bitmap.close();
  // The editor was closed while the image was measured.
  if (!cesdk.engine) return;
  cesdk.engine.asset.addAssetToSource(set.sourceId, {
    id: `variant-${++added}`,
    label: { en: `Variant ${variant.index + 1}` },
    meta: { uri: variant.uri, thumbUri: variant.uri, kind: 'image', fillType: '//ly.img.ubq/fill/image', width, height, mimeType: variant.blob.type || 'image/png' },
  });
}
