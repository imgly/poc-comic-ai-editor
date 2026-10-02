/** The scene the editor starts with: one empty page at the size chosen on the start screen. */
import type CreativeEditorSDK from '@cesdk/cesdk-js';
import { t } from '@/lib/i18n';
import type { PagePreset } from '../ratios';
import { EMPTY_PAGE } from '../tokens';

export function createScene(cesdk: CreativeEditorSDK, preset: PagePreset): void {
  const { engine } = cesdk;
  const scene = engine.scene.create('Free');
  engine.scene.setDesignUnit('Pixel');
  engine.scene.setFontSizeUnit('Pixel');
  const page = engine.block.create('page');
  engine.block.setWidth(page, preset.width);
  engine.block.setHeight(page, preset.height);
  engine.block.setName(page, t('page.name'));
  const fill = engine.block.createFill('color');
  // Dark like the rest of the editor until the page gets its background.
  engine.block.setColor(fill, 'fill/color/value', { ...EMPTY_PAGE, a: 1 });
  engine.block.setFill(page, fill);
  engine.block.appendChild(scene, page);
}
