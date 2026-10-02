/** The page the start screen hands to the editor: an aspect ratio at one of the image sizes. */
import { pageDimensions, PAGE_SIZES, type PageSizeId, type Ratio } from './ratios';

export type PagePreset = {
  width: number;
  height: number;
  /** Human readable ratio, shown next to the size. */
  ratio: string;
};

export function pagePreset(ratio: Ratio, size: PageSizeId): PagePreset {
  const { megapixels } = PAGE_SIZES.find((s) => s.id === size) ?? PAGE_SIZES[1];
  return { ratio: ratio.id, ...pageDimensions(ratio, megapixels) };
}
