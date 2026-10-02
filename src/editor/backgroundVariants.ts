/**
 * Background variants that are still up for selection. They live in the page's metadata: the
 * canvas menu re-renders when engine state it has read changes, so the stepper reads this
 * metadata and a write to it updates the counter ("Variante 2 von 4"). The page fill always
 * shows the current variant.
 */
import type { CreativeEngine } from '@cesdk/cesdk-js';
import { applyBackground, selectOnly } from './blocks';

const VARIANTS_KEY = 'comic/variants';

export type BackgroundVariants = {
  /** Image URIs in the order they arrived. */
  uris: string[];
  /** The variant shown on the page. */
  index: number;
  /** How many variants there will be once generation has finished. */
  total: number;
  loading: boolean;
};

/**
 * Pages with a generation run in progress. Kept in memory, not in the metadata: metadata is part
 * of the undo history, and an undo must not bring back a stepper that waits for variants forever.
 */
const generating = new Set<number>();

export function backgroundVariants(engine: CreativeEngine, page: number): BackgroundVariants | null {
  try {
    if (!engine.block.isValid(page) || !engine.block.hasMetadata(page, VARIANTS_KEY)) return null;
    const raw = engine.block.getMetadata(page, VARIANTS_KEY);
    if (!raw) return null;
    const variants = JSON.parse(raw) as BackgroundVariants;
    if (!variants.loading || generating.has(page)) return variants;
    // "Loading" left over from an undone state: no more variants are coming.
    return variants.uris.length ? { ...variants, total: variants.uris.length, loading: false } : null;
  } catch {
    return null;
  }
}

function write(engine: CreativeEngine, page: number, variants: BackgroundVariants | null): void {
  engine.block.setMetadata(page, VARIANTS_KEY, variants ? JSON.stringify(variants) : '');
}

/** A generation run begins; variants that were still up for selection are dropped. */
export function startBackgroundVariants(engine: CreativeEngine, page: number, total: number): void {
  generating.add(page);
  write(engine, page, { uris: [], index: 0, total, loading: true });
}

/** A variant arrived. The first one goes onto the page right away and the page gets selected, which brings up its menu. */
export function addBackgroundVariant(engine: CreativeEngine, page: number, uri: string): void {
  const variants = backgroundVariants(engine, page);
  if (variants === null) return;
  variants.uris.push(uri);
  if (variants.uris.length === 1) {
    applyBackground(engine, page, uri, { undoStep: false });
    selectOnly(engine, page);
  }
  write(engine, page, variants);
}

/** The run is over; failed requests shrink the total. */
export function finishBackgroundVariants(engine: CreativeEngine, page: number): void {
  generating.delete(page);
  try {
    const variants = backgroundVariants(engine, page);
    if (variants !== null) write(engine, page, variants.uris.length ? { ...variants, total: variants.uris.length, loading: false } : null);
  } catch {
    // The editor was closed while the run was in progress.
  }
}

/** Shows the previous (-1) or next (+1) variant, counted from the one currently shown. */
export function stepBackgroundVariant(engine: CreativeEngine, page: number, step: -1 | 1): void {
  const variants = backgroundVariants(engine, page);
  if (variants === null) return;
  const index = variants.index + step;
  if (index < 0 || index >= variants.uris.length) return;
  applyBackground(engine, page, variants.uris[index], { undoStep: false });
  write(engine, page, { ...variants, index });
}

/** The shown variant stays as the background and the stepper goes away. */
export function acceptBackgroundVariant(engine: CreativeEngine, page: number): void {
  clearBackgroundVariants(engine, page);
  engine.editor.addUndoStep();
}

/** Ends the selection without an undo step of its own, for callers that replace the background. */
export function clearBackgroundVariants(engine: CreativeEngine, page: number): void {
  if (backgroundVariants(engine, page) !== null) write(engine, page, null);
}
