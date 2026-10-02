/**
 * Engine helpers: how the PoC's concepts map onto CE.SDK blocks.
 *
 *  - Background: the image fill of the page itself, so objects always sit above it.
 *  - Area: a graphic block with a translucent fill and a dashed stroke; marks where an object
 *    will be generated. Tagged with metadata `comic/role = area`.
 *  - Object: an area that received a generated image; a regular image block from then on.
 *    Tagged `comic/role = object`.
 *
 * Block metadata is used for these tags because it is saved with the scene and because CE.SDK's
 * UI re-renders when metadata it has read changes.
 */
import type { CreativeEngine } from '@cesdk/cesdk-js';
import { t } from '@/lib/i18n';
import { RATIOS, ratioValue } from '../ratios';
import { ACCENT } from '../tokens';

const ROLE_KEY = 'comic/role';
const PROMPT_KEY = 'comic/prompt';
const BUSY_KEY = 'comic/busy';
const IMAGE_FILL = '//ly.img.ubq/fill/image';

export type Role = 'area' | 'object';

export function currentPage(engine: CreativeEngine): number | null {
  const page = engine.scene.getCurrentPage();
  if (page !== null && engine.block.isValid(page)) return page;
  const pages = engine.scene.getPages();
  return pages.length ? pages[0] : null;
}

export function roleOf(engine: CreativeEngine, id: number): Role | null {
  try {
    if (!engine.block.isValid(id) || !engine.block.hasMetadata(id, ROLE_KEY)) return null;
    const role = engine.block.getMetadata(id, ROLE_KEY);
    return role === 'area' || role === 'object' ? role : null;
  } catch {
    return null;
  }
}

/** The single selected area or object block, i.e. what Create Object generates into. */
export function selectedTarget(engine: CreativeEngine): number | null {
  const selected = engine.block.findAllSelected();
  return selected.length === 1 && roleOf(engine, selected[0]) !== null ? selected[0] : null;
}

/** The page, if it is the only selected block. */
export function selectedPage(engine: CreativeEngine): number | null {
  const selected = engine.block.findAllSelected();
  return selected.length === 1 && engine.block.getType(selected[0]) === '//ly.img.ubq/page' ? selected[0] : null;
}

/** The single selected placed object (an area that received a variant), or null. */
export function selectedObject(engine: CreativeEngine): number | null {
  const selected = engine.block.findAllSelected();
  return selected.length === 1 && roleOf(engine, selected[0]) === 'object' ? selected[0] : null;
}

/** Blocks for which "Place object" is running right now. */
const placing = new Set<number>();

/**
 * Whether "Place object" is running for this block. The answer comes from memory, so an undo can
 * never bring back a stale "busy" object. The metadata is read anyway: a canvas-menu component
 * re-renders when engine state it has read changes, so this read is what makes the button update
 * when `setPlacing` writes the flag.
 */
export function isPlacing(engine: CreativeEngine, id: number): boolean {
  try {
    if (engine.block.hasMetadata(id, BUSY_KEY)) engine.block.getMetadata(id, BUSY_KEY);
  } catch {
    // The block is gone; the answer below still holds.
  }
  return placing.has(id);
}

/** Starts or ends the busy state and writes the flag that re-renders the canvas menu. */
export function setPlacing(engine: CreativeEngine, id: number, busy: boolean): void {
  if (busy) placing.add(id);
  else placing.delete(id);
  try {
    if (engine.block.isValid(id)) engine.block.setMetadata(id, BUSY_KEY, busy ? '1' : '');
  } catch {
    // The editor was closed while the operation ran.
  }
}

/** The prompt an object was generated from (stored when the variant was placed). */
export function objectPrompt(engine: CreativeEngine, id: number): string | null {
  try {
    return engine.block.hasMetadata(id, PROMPT_KEY) ? engine.block.getMetadata(id, PROMPT_KEY) || null : null;
  } catch {
    return null;
  }
}

export function selectOnly(engine: CreativeEngine, id: number): void {
  engine.block.findAllSelected().forEach((b) => b !== id && engine.block.setSelected(b, false));
  engine.block.setSelected(id, true);
}

/** Creates the dashed, translucent rectangle that marks where an object will be generated. */
export function createAreaBlock(engine: CreativeEngine, page: number, x: number, y: number, w: number, h: number): number {
  const block = engine.block.create('graphic');
  engine.block.setShape(block, engine.block.createShape('rect'));
  const fill = engine.block.createFill('color');
  engine.block.setColor(fill, 'fill/color/value', { ...ACCENT, a: 0.16 });
  engine.block.setFill(block, fill);
  engine.block.setStrokeEnabled(block, true);
  engine.block.setStrokeColor(block, { ...ACCENT, a: 1 });
  engine.block.setStrokeWidth(block, Math.max(2, Math.round(Math.min(w, h) / 80)));
  engine.block.setStrokeStyle(block, 'Dashed');
  engine.block.setPositionX(block, x);
  engine.block.setPositionY(block, y);
  engine.block.setWidth(block, w);
  engine.block.setHeight(block, h);
  engine.block.setName(block, t('area.block'));
  engine.block.setMetadata(block, ROLE_KEY, 'area');
  engine.block.appendChild(page, block);
  selectOnly(engine, block);
  engine.editor.addUndoStep();
  return block;
}

export function blockSize(engine: CreativeEngine, id: number): { width: number; height: number } {
  return { width: engine.block.getFrameWidth(id), height: engine.block.getFrameHeight(id) };
}

/** Resizes the area, keeping its top-left corner and staying inside the page. */
export function resizeArea(engine: CreativeEngine, id: number, width: number, height: number): void {
  const page = engine.block.getParent(id);
  const pw = page !== null ? engine.block.getFrameWidth(page) : Infinity;
  const ph = page !== null ? engine.block.getFrameHeight(page) : Infinity;
  const x = engine.block.getPositionX(id);
  const y = engine.block.getPositionY(id);
  // Shrink proportionally, so the ratio survives, if the size does not fit from the current position.
  const scale = Math.min(1, (pw - x) / width, (ph - y) / height);
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  engine.block.setWidth(id, w);
  engine.block.setHeight(id, h);
  engine.editor.addUndoStep();
}

/** The editor's ratio that width × height matches (within 1.5 %), e.g. 1872×1056 → "16:9"; else "1.78:1". */
export function ratioLabel(width: number, height: number): string {
  const r = width / height;
  const match = RATIOS.find((c) => Math.abs(r / ratioValue(c) - 1) < 0.015);
  return match ? match.id : `${Math.round(r * 100) / 100}:1`;
}

function setImageFill(engine: CreativeEngine, id: number, uri: string): void {
  const existing = engine.block.supportsFill(id) && engine.block.isValid(engine.block.getFill(id)) ? engine.block.getFill(id) : null;
  if (existing !== null && engine.block.getType(existing) === IMAGE_FILL) {
    engine.block.setSourceSet(existing, 'fill/image/sourceSet', []);
    engine.block.setString(existing, 'fill/image/imageFileURI', uri);
  } else {
    const fill = engine.block.createFill('image');
    engine.block.setString(fill, 'fill/image/imageFileURI', uri);
    engine.block.setFill(id, fill);
    if (existing !== null) engine.block.destroy(existing);
  }
  if (engine.block.supportsContentFillMode(id)) engine.block.setContentFillMode(id, 'Cover');
  if (engine.block.supportsCrop(id)) engine.block.resetCrop(id);
}

/** The page's background image URI, or null while no background has been applied. */
export function backgroundImageUri(engine: CreativeEngine, page: number): string | null {
  try {
    if (!engine.block.supportsFill(page) || !engine.block.isFillEnabled(page)) return null;
    const fill = engine.block.getFill(page);
    if (!engine.block.isValid(fill) || engine.block.getType(fill) !== IMAGE_FILL) return null;
    const uri = engine.block.getString(fill, 'fill/image/imageFileURI');
    return uri || null;
  } catch {
    return null;
  }
}

/** A background variant becomes the page's own fill, so objects always sit above it. */
export function applyBackground(engine: CreativeEngine, page: number, uri: string, opts: { undoStep?: boolean } = {}): void {
  setImageFill(engine, page, uri);
  engine.block.setFillEnabled(page, true);
  if (opts.undoStep !== false) engine.editor.addUndoStep();
}

/** An object variant fills the area block, which turns into a regular image layer. */
export function applyObject(engine: CreativeEngine, id: number, uri: string, prompt?: string): void {
  setImageFill(engine, id, uri);
  engine.block.setStrokeEnabled(id, false);
  engine.block.setMetadata(id, ROLE_KEY, 'object');
  if (prompt) engine.block.setMetadata(id, PROMPT_KEY, prompt);
  engine.block.setName(id, t('object.block'));
  engine.editor.addUndoStep();
}
