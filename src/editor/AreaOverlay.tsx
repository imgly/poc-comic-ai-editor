'use client';

/**
 * Canvas overlays for the Create Object tool, drawn in the DOM on top of the CE.SDK canvas.
 *
 * `AreaOverlay` is the drag-to-mark layer: active while the panel waits for an area, a drag on the
 * page creates an area block. Only the snapped rectangle is drawn while dragging (see `snapArea`);
 * a ratio strip, a large label inside the rectangle and a tag show which ratio it snapped to.
 * `AreaTag` labels the selected empty area with its ratio and size, also while it is resized.
 *
 * Screen rectangles are read from the engine each frame so panning and zooming stay in sync.
 */
import type CreativeEditorSDK from '@cesdk/cesdk-js';
import { useEffect, useRef, useState } from 'react';
import { blockSize, createAreaBlock, currentPage, ratioLabel, roleOf } from './blocks';
import { t } from './i18n';
import { RATIOS_TALL_TO_WIDE, snapArea, type Point, type SnappedArea } from './ratios';
import { editorStore, useEditorState } from './store';

type Rect = { left: number; top: number; width: number; height: number };
type Frame = { view: Rect; block: Rect };

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
function measure(cesdk: CreativeEditorSDK, host: HTMLElement, block: number): Frame | null {
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

/** Drags whose snapped rectangle stays below this edge (screen pixels) count as accidental clicks. */
const MIN_DRAG = 8;

export function AreaOverlay({ cesdk, host }: { cesdk: CreativeEditorSDK; host: HTMLElement | null }) {
  const { markArea } = useEditorState();
  const [frame, setFrame] = useState<Frame | null>(null);
  const drag = useRef<Point | null>(null);
  const [draft, setDraft] = useState<SnappedArea | null>(null);

  useEffect(() => {
    if (!markArea || !host) return;
    let raf = 0;
    const tick = () => {
      const page = currentPage(cesdk.engine);
      const next = page !== null ? measure(cesdk, host, page) : null;
      if (next) setFrame(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [markArea, host, cesdk]);

  const page = currentPage(cesdk.engine);
  if (!markArea || !frame || page === null) return null;
  const { view, block: pageRect } = frame;
  const pageSize = blockSize(cesdk.engine, page);
  /** Page pixels per screen pixel. */
  const scale = pageSize.width / pageRect.width;

  // Pointer position in page pixels, clamped to the page.
  const toPage = (e: React.PointerEvent): Point => {
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (e.clientX - box.left + view.left - pageRect.left) * scale;
    const y = (e.clientY - box.top + view.top - pageRect.top) * scale;
    return { x: Math.max(0, Math.min(pageSize.width, x)), y: Math.max(0, Math.min(pageSize.height, y)) };
  };
  // Page pixels → position inside the overlay.
  const toOverlay = (r: { x: number; y: number; width: number; height: number }) => ({
    left: pageRect.left - view.left + r.x / scale,
    top: pageRect.top - view.top + r.y / scale,
    width: r.width / scale,
    height: r.height / scale,
  });

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = toPage(e);
    setDraft(null);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setDraft(snapArea(drag.current, toPage(e)));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const area = snapArea(drag.current, toPage(e));
    drag.current = null;
    setDraft(null);
    // Ignore accidental clicks and keep waiting for a real drag.
    if (area.width / scale < MIN_DRAG || area.height / scale < MIN_DRAG) return;
    createAreaBlock(cesdk.engine, page, area.x, area.y, area.width, area.height);
    editorStore.setMarkArea(false);
  };

  const snapped = draft && draft.width > 0 && draft.height > 0 ? toOverlay(draft) : null;

  return (
    <div
      className="absolute overflow-hidden select-none"
      style={{ left: view.left, top: view.top, width: view.width, height: view.height, cursor: 'crosshair', touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Slight dim outside the page so the drop zone is obvious. */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: pageRect.left - view.left,
          top: pageRect.top - view.top,
          width: pageRect.width,
          height: pageRect.height,
          boxShadow: '0 0 0 100000px rgba(0, 0, 0, 0.35)',
          outline: '1px solid rgba(140, 188, 255, 0.6)',
        }}
      />
      {draft && snapped && (
        <div className="absolute pointer-events-none flex items-center justify-center" style={{ ...snapped, border: '2px solid var(--cs-accent)', background: 'rgba(140, 188, 255, 0.22)' }}>
          {snapped.width >= 72 && snapped.height >= 44 && (
            <span className="text-white font-medium leading-none [text-shadow:0_1px_3px_rgb(0_0_0/0.65)]" style={{ fontSize: Math.max(18, Math.min(44, snapped.height * 0.3, snapped.width * 0.22)) }}>
              {draft.ratio.id}
            </span>
          )}
          <span className="absolute -top-[26px] -left-0.5 text-xs leading-none text-(--cs-on-accent) bg-(--cs-accent) px-2 py-[5px] rounded-[3px] whitespace-nowrap">
            <b className="font-bold">{draft.ratio.id}</b> · {draft.width} × {draft.height}
          </span>
        </div>
      )}
      {/* All ratios from tall to wide; the one the rectangle is snapped to is highlighted. */}
      <div className="absolute left-1/2 top-3 -translate-x-1/2 flex flex-col items-center gap-2 bg-(--cs-card) border border-(--cs-border) rounded-xl shadow-lg px-3 py-2.5 pointer-events-none">
        <div className="text-xs text-(--cs-text) whitespace-nowrap">{t(snapped ? 'area.overlay.snapped' : 'area.overlay')}</div>
        <div className="flex gap-1">
          {RATIOS_TALL_TO_WIDE.map((r) => {
            const active = snapped !== null && draft?.ratio.id === r.id;
            return (
              <span
                key={r.id}
                className={`text-[11px] leading-none px-2 py-1.5 rounded-full border whitespace-nowrap ${
                  active ? 'bg-(--cs-accent) border-(--cs-accent) text-(--cs-on-accent) font-bold' : 'border-(--cs-border) text-(--cs-text-soft)'
                }`}
              >
                {r.id}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type Tag = { left: number; top: number; view: Rect; ratio: string; size: string };

/**
 * Ratio and size of the selected empty area, as a tag in its top-left corner. Inside the area,
 * because the space above and below it belongs to the canvas menu and the rotate handle; an area
 * too small to hold the tag gets it on its right side.
 */
export function AreaTag({ cesdk, host }: { cesdk: CreativeEditorSDK; host: HTMLElement | null }) {
  const { markArea } = useEditorState();
  const [tag, setTag] = useState<Tag | null>(null);

  useEffect(() => {
    if (!host) return;
    let raf = 0;
    let last = 'null';
    const tick = () => {
      let next: Tag | null = null;
      try {
        const { engine } = cesdk;
        const selected = engine.block.findAllSelected();
        if (selected.length === 1 && roleOf(engine, selected[0]) === 'area') {
          const frame = measure(cesdk, host, selected[0]);
          const { width, height } = blockSize(engine, selected[0]);
          if (frame) {
            const fits = frame.block.width >= 130 && frame.block.height >= 40;
            next = { left: frame.block.left - frame.view.left + (fits ? 6 : frame.block.width + 10), top: frame.block.top - frame.view.top + (fits ? 6 : 0), view: frame.view, ratio: ratioLabel(width, height), size: `${Math.round(width)} × ${Math.round(height)}` };
          }
        }
      } catch {
        // The engine is going away; the component unmounts with it.
      }
      const key = JSON.stringify(next);
      if (key !== last) {
        last = key;
        setTag(next);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cesdk, host]);

  if (!tag || markArea) return null;
  return (
    <div className="absolute overflow-hidden pointer-events-none" style={tag.view}>
      <span className="absolute text-xs leading-none text-(--cs-on-accent) bg-(--cs-accent) px-2 py-[5px] rounded-[3px] whitespace-nowrap" style={{ left: tag.left, top: tag.top }}>
        <b className="font-bold">{tag.ratio}</b> · {tag.size}
      </span>
    </div>
  );
}
