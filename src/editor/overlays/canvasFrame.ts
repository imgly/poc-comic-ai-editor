/**
 * Where things are on screen. The overlays are DOM elements on top of the CE.SDK canvas, so they
 * need the canvas area and the rectangle of a block in the same coordinates.
 *
 * This file is one of the few places that depend on CE.SDK's markup instead of a documented API:
 * the free canvas area is found by a class name inside the editor's shadow root. Check it after
 * an SDK update (see CUSTOMIZATION.md, "Beyond the public API").
 */
import type CreativeEditorSDK from '@cesdk/cesdk-js';

export type Rect = { left: number; top: number; width: number; height: number };
export type Frame = { view: Rect; block: Rect };

/**
 * Locates the engine canvas and the visible canvas area inside the editor's open shadow DOM.
 * `getScreenSpaceBoundingBoxXYWH` is relative to the `<cesdk-canvas>` element, which spans the
 * whole editor. The canvas container is the part that dock, bars and panels leave free; the
 * canvas viewport (the fallback) still reaches under docked panels in 1.83.
 */
function findCanvasElements(root: Element): { canvas: Element; viewport: Element } | null {
  const walk = (scope: Element | ShadowRoot): { canvas: Element; viewport: Element } | null => {
    const canvas = scope.querySelector('cesdk-canvas, canvas');
    if (canvas) {
      const viewport = scope.querySelector('[class*="Editor-module__canvasContainer"]') ?? scope.querySelector('[class*="canvasViewport"]') ?? canvas;
      return { canvas, viewport };
    }
    for (const child of scope.children) {
      const r = (child.shadowRoot && walk(child.shadowRoot)) || walk(child);
      if (r) return r;
    }
    return null;
  };
  return walk(root);
}

/** The canvas viewport and a block's rectangle, both in the host element's coordinates. */
export function measure(cesdk: CreativeEditorSDK, host: HTMLElement, block: number): Frame | null {
  const found = findCanvasElements(host);
  if (!found) return null;
  const hostBox = host.getBoundingClientRect();
  const canvasBox = found.canvas.getBoundingClientRect();
  const viewBox = found.viewport.getBoundingClientRect();
  const [x, y, w, h] = cesdk.engine.block.getScreenSpaceBoundingBoxXYWH([block]);
  return {
    view: { left: viewBox.left - hostBox.left, top: viewBox.top - hostBox.top, width: viewBox.width, height: viewBox.height },
    block: { left: canvasBox.left - hostBox.left + x, top: canvasBox.top - hostBox.top + y, width: w, height: h },
  };
}
