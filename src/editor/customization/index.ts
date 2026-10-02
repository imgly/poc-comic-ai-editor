/**
 * CUSTOMIZATION ENTRY POINT
 *
 * Everything this PoC changes about the stock CE.SDK editor is applied here, in one function, on
 * top of the unmodified Advanced Design Editor starter kit configuration (`src/imgly/config`).
 * Each step lives in its own file next to this one, named after the part of the editor it
 * changes, the same way the starter kit splits its configuration:
 *
 *   theme.ts          look: colours on the canvas, shapes the theme variables do not cover
 *   translations.ts   UI language and the PoC's own labels
 *   features.ts       which stock features are on, off or conditional
 *   navigationBar.ts  top bar
 *   dock.ts           left dock: the two tools and the layer list
 *   panels/           the two tool panels (builder API)
 *   canvas.ts         canvas bar and context menu: variant stepper, "Place object"
 *   areas.ts          behaviour of the object areas (ratio lock)
 *
 * The colours, radii and the font of the theme are plain CSS: see `src/app/globals.css`.
 * CUSTOMIZATION.md at the project root is the guide to all of this.
 *
 * @see https://img.ly/docs/cesdk/js/user-interface/overview-41101a/
 */
import type CreativeEditorSDK from '@cesdk/cesdk-js';
import { BlurAssetSource, ColorPaletteAssetSource, CropPresetsAssetSource, EffectsAssetSource, FiltersAssetSource } from '@cesdk/cesdk-js/plugins';
import { AdvancedEditorConfig } from '@/imgly/config/plugin';
import { setupAreas } from './areas';
import { setupCanvasMenu } from './canvas';
import { setupDock } from './dock';
import { setupFeatures } from './features';
import { setupNavigationBar } from './navigationBar';
import { setupPanels } from './panels';
import { setupTheme } from './theme';
import { setupTranslations } from './translations';

export { watchPanels } from './panels';

export async function setupEditor(cesdk: CreativeEditorSDK): Promise<void> {
  // 1. The base: the starter kit's configuration plugin, unmodified. It resets the editor, switches
  //    to the advanced view and sets up features, UI, actions, shortcuts and engine settings.
  await cesdk.addPlugin(new AdvancedEditorConfig());

  // 2. Asset sources for the stock inspector of a placed object: the Filter, Effect, Blur and
  //    Crop panels and the colour pickers list assets and stay empty without their source. The
  //    starter kit loads many more (templates, stickers, fonts ...); this editor has no use for
  //    them, so only these are added.
  await Promise.all([
    cesdk.addPlugin(new FiltersAssetSource()),
    cesdk.addPlugin(new EffectsAssetSource()),
    cesdk.addPlugin(new BlurAssetSource()),
    cesdk.addPlugin(new CropPresetsAssetSource()),
    cesdk.addPlugin(new ColorPaletteAssetSource()),
  ]);

  // 3. The customizations. Each one stands on its own; the order here follows the list above.
  setupTheme(cesdk);
  setupTranslations(cesdk);
  setupFeatures(cesdk);
  setupNavigationBar(cesdk);
  setupPanels(cesdk);
  setupDock(cesdk);
  setupCanvasMenu(cesdk);
  setupAreas(cesdk);
}
