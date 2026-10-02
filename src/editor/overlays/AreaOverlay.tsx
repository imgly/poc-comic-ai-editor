'use client';

/**
 * CUSTOMIZATION: drawing an object area
 *
 * The one interaction CE.SDK has no stock tool for, so it is an own React layer on top of the
 * canvas. It is active while the Create Object panel waits for an area: a drag on the page
 * creates an area block. Only the snapped rectangle is drawn while dragging (see `snapArea` in
 * ratios.ts); a ratio strip, a large label inside the rectangle and a tag show which ratio it
 * snapped to.
 *
 * The page's screen rectangle is read from the engine each frame, so panning and zooming stay in
 * sync.
 */
import type CreativeEditorSDK from '@cesdk/cesdk-js';
import { useEffect, useRef, useState } from 'react';
import { blockSize, createAreaBlock, currentPage } from '@/editor/engine/blocks';
import { t } from '@/lib/i18n';
import { RATIOS_TALL_TO_WIDE, snapArea, type Point, type SnappedArea } from '../ratios';
import { editorStore, useEditorState } from '../store';
import { measure, type Frame } from './canvasFrame';

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
