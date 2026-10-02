/**
 * The aspect ratios the editor works with. The start screen offers them for the page, a marked
 * area snaps to them, and the models are asked for them.
 */
export type Ratio = { id: string; w: number; h: number };

export const RATIOS: Ratio[] = ['1:1', '5:4', '4:5', '4:3', '3:4', '3:2', '2:3', '16:9', '9:16', '21:9'].map((id) => {
  const [w, h] = id.split(':').map(Number);
  return { id, w, h };
});

export function ratioValue(ratio: Ratio): number {
  return ratio.w / ratio.h;
}

/** The ratios from tall to wide, the order in which a drag passes through them. */
export const RATIOS_TALL_TO_WIDE: Ratio[] = [...RATIOS].sort((a, b) => ratioValue(a) - ratioValue(b));

export type Point = { x: number; y: number };
export type SnappedArea = { ratio: Ratio; x: number; y: number; width: number; height: number };

/**
 * The rectangle a drag from `start` to `end` snaps to, in page coordinates.
 *
 * Every ratio is a diagonal line through the start corner; the drag takes the ratio whose diagonal
 * the pointer is nearest to. The rectangle is the largest one with that ratio inside the dragged
 * box, anchored at the start corner, so it never reaches beyond what was dragged and has no
 * minimum size.
 */
export function snapArea(start: Point, end: Point): SnappedArea {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const a = Math.abs(dx);
  const b = Math.abs(dy);
  let ratio = RATIOS[0];
  let distance = Infinity;
  for (const r of RATIOS) {
    // Distance of the pointer from this ratio's diagonal.
    const d = Math.abs(a * r.h - b * r.w) / Math.hypot(r.w, r.h);
    if (d < distance) {
      distance = d;
      ratio = r;
    }
  }
  const value = ratioValue(ratio);
  const width = Math.round(Math.min(a, b * value));
  const height = Math.round(width / value);
  return { ratio, x: Math.round(dx < 0 ? start.x - width : start.x), y: Math.round(dy < 0 ? start.y - height : start.y), width, height };
}

/** Page sizes: megapixels per step; edges are multiples of 16 as image models expect. */
export const PAGE_SIZES = [
  { id: 'small', megapixels: 1 },
  { id: 'medium', megapixels: 2 },
  { id: 'large', megapixels: 4 },
] as const;

export type PageSizeId = (typeof PAGE_SIZES)[number]['id'];

export function pageDimensions(ratio: Ratio, megapixels: number): { width: number; height: number } {
  const value = ratioValue(ratio);
  const width = Math.floor(Math.sqrt(megapixels * 1_000_000 * value) / 16) * 16;
  const height = Math.round(width / value / 16) * 16;
  return { width, height };
}
