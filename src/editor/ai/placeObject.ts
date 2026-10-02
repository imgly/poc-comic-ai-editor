/**
 * "Place object": bakes a placed object into the background with AI-adjusted lighting and shadow.
 *
 * The page is rendered with the background and the selected object only. The area around the
 * object is cropped from that render and sent to an image-to-image model with the instruction to
 * integrate the object (lighting, colours, cast shadow) and change nothing else. The answer is
 * pasted back into the render with feathered edges, the result becomes the page's background and
 * the object block is removed, so the object is now part of the picture.
 */
import type { CreativeEngine } from '@cesdk/cesdk-js';
import { clearBackgroundVariants } from '../backgroundVariants';
import { applyBackground, objectPrompt, ratioLabel, roleOf } from '../blocks';
import { DEFAULT_MODEL, getImageAI, type ImageAI } from './gateway';

/**
 * Upper limit for the long edge of the page render that becomes the new background. Every page
 * size the start screen offers is below it, so the background keeps the page's resolution.
 */
const RENDER_EDGE = 4096;
/** Smallest crop edge sent to the model, in render pixels. */
const MIN_CROP_EDGE = 640;

/**
 * The model for the edit: the configured one, else the default object model if the gateway key
 * offers it, else the first image-to-image model on the list.
 */
async function placeModel(ai: ImageAI): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_IMGLY_AI_PLACE_MODEL;
  if (configured) return configured;
  const models = await ai.listModels('image2image');
  return models.some((m) => m.id === DEFAULT_MODEL.image2image) ? DEFAULT_MODEL.image2image : models[0].id;
}

type Rect = { x: number; y: number; w: number; h: number };

function canvasOf(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d')! };
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'));
}

/** The area sent to the model: the object plus generous surroundings, clamped to the render. */
function areaAround(object: Rect, width: number, height: number): Rect {
  let x0 = object.x - object.w * 0.7;
  let x1 = object.x + object.w * 1.7;
  let y0 = object.y - object.h * 0.5;
  let y1 = object.y + object.h * 1.9;
  // Grow small areas so the model gets enough context and resolution.
  if (x1 - x0 < MIN_CROP_EDGE) {
    const c = (x0 + x1) / 2;
    x0 = c - MIN_CROP_EDGE / 2;
    x1 = c + MIN_CROP_EDGE / 2;
  }
  if (y1 - y0 < MIN_CROP_EDGE) {
    const c = (y0 + y1) / 2;
    y0 = c - MIN_CROP_EDGE / 2;
    y1 = c + MIN_CROP_EDGE / 2;
  }
  x0 = Math.max(0, Math.round(x0));
  y0 = Math.max(0, Math.round(y0));
  x1 = Math.min(width, Math.round(x1));
  y1 = Math.min(height, Math.round(y1));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/**
 * Renders the page with only the background and the given object visible; other objects and
 * areas are hidden for the render and restored afterwards.
 */
async function renderPageWith(engine: CreativeEngine, page: number, object: number, width: number, height: number): Promise<Blob> {
  const hidden = engine.block.getChildren(page).filter((b) => b !== object && roleOf(engine, b) !== null && engine.block.isVisible(b));
  hidden.forEach((b) => engine.block.setVisible(b, false));
  try {
    await engine.block.forceLoadResources([page]);
    return await engine.block.export(page, { mimeType: 'image/png', targetWidth: width, targetHeight: height });
  } finally {
    hidden.forEach((b) => engine.block.setVisible(b, true));
  }
}

export type PlaceStep = 'render' | 'generate' | 'compose';

/** Runs the whole flow. Throws with a readable message when the model fails. */
export async function placeObject(engine: CreativeEngine, object: number, onStep?: (step: PlaceStep) => void): Promise<void> {
  const page = engine.block.getParent(object);
  if (page === null) throw new Error('The object is not on a page');
  const pageW = engine.block.getFrameWidth(page);
  const pageH = engine.block.getFrameHeight(page);
  const scale = Math.min(1, RENDER_EDGE / Math.max(pageW, pageH));
  const renderW = Math.round(pageW * scale);
  const renderH = Math.round(pageH * scale);
  const objectRect: Rect = {
    x: engine.block.getPositionX(object) * scale,
    y: engine.block.getPositionY(object) * scale,
    w: engine.block.getFrameWidth(object) * scale,
    h: engine.block.getFrameHeight(object) * scale,
  };

  // 1. Render background + object, crop the area around the object.
  onStep?.('render');
  const renderBlob = await renderPageWith(engine, page, object, renderW, renderH);
  const render = await createImageBitmap(renderBlob);
  const area = areaAround(objectRect, renderW, renderH);
  const { canvas: cropCanvas, ctx: cropCtx } = canvasOf(area.w, area.h);
  cropCtx.drawImage(render, area.x, area.y, area.w, area.h, 0, 0, area.w, area.h);

  // 2. Ask the model to integrate the object.
  onStep?.('generate');
  const ai = await getImageAI();
  const what = objectPrompt(engine, object) ?? 'the newly added object';
  const prompt = `This is a crop of an illustrated scene into which ${what} was pasted; it still looks flat and cut out. Integrate it naturally: adjust its lighting, contrast and colours to the scene and add a natural cast shadow and contact shadow that match the direction, softness and colour of the light in the scene. Keep everything else exactly as it is: same framing, same composition, no moved or resized elements, no new elements, same art style.`;
  const imageUrl = await ai.uploadImage(await toBlob(cropCanvas));
  const resultBlob = await ai.generate({ model: await placeModel(ai), prompt, ratio: ratioLabel(area.w, area.h), imageUrl });
  const result = await createImageBitmap(resultBlob);

  // 3. Paste the answer back with feathered edges so the seam disappears.
  onStep?.('compose');
  const { canvas: patch, ctx: patchCtx } = canvasOf(area.w, area.h);
  patchCtx.drawImage(result, 0, 0, area.w, area.h);
  const feather = Math.round(Math.min(area.w, area.h) * 0.06);
  const { canvas: mask, ctx: maskCtx } = canvasOf(area.w, area.h);
  maskCtx.filter = `blur(${feather}px)`;
  maskCtx.fillStyle = '#fff';
  maskCtx.fillRect(feather * 1.5, feather * 1.5, area.w - feather * 3, area.h - feather * 3);
  // Edges that touch the render border need no feathering.
  maskCtx.filter = 'none';
  if (area.x === 0) maskCtx.fillRect(0, 0, feather * 3, area.h);
  if (area.y === 0) maskCtx.fillRect(0, 0, area.w, feather * 3);
  if (area.x + area.w === renderW) maskCtx.fillRect(area.w - feather * 3, 0, feather * 3, area.h);
  if (area.y + area.h === renderH) maskCtx.fillRect(0, area.h - feather * 3, area.w, feather * 3);
  patchCtx.globalCompositeOperation = 'destination-in';
  patchCtx.drawImage(mask, 0, 0);
  const { canvas: composed, ctx: composedCtx } = canvasOf(renderW, renderH);
  composedCtx.drawImage(render, 0, 0);
  composedCtx.drawImage(patch, area.x, area.y);
  render.close();
  result.close();

  // 4. The composite becomes the background; the object block is gone.
  const uri = URL.createObjectURL(await toBlob(composed));
  // Background variants that were still up for selection are settled by this: stepping to
  // another one would throw the placed object away.
  clearBackgroundVariants(engine, page);
  applyBackground(engine, page, uri, { undoStep: false });
  engine.block.findAllSelected().forEach((b) => engine.block.setSelected(b, false));
  engine.block.destroy(object);
  engine.editor.addUndoStep();
}
