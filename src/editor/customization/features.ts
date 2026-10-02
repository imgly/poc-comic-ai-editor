/**
 * CUSTOMIZATION: features
 *
 * CE.SDK's UI is made of features that can be switched on, off or bound to a condition. The
 * starter kit's `src/imgly/config/features.ts` enables the full advanced editor; this file takes
 * away what a comic asset does not need and adds the layer list's thumbnails.
 *
 * To bring a stock feature back, delete its line here. To make one conditional, use
 * `cesdk.feature.set(id, predicate)` as done for the inspector below.
 *
 * @see https://img.ly/docs/cesdk/js/user-interface/customization/disable-or-enable-f058e2/
 */
import type CreativeEditorSDK from '@cesdk/cesdk-js';
import type { FeaturePredicate } from '@cesdk/cesdk-js';

export function setupFeatures(cesdk: CreativeEditorSDK): void {
  // #region Single page
  // The asset is one page whose size is chosen on the start screen.
  cesdk.feature.enable(['ly.img.page.add', 'ly.img.page.resize'], false);
  // No page title above the canvas; it would sit right where the page's context menu appears.
  cesdk.engine.editor.setSetting('page/title/show', false);
  // #endregion

  // #region Inspector content
  // Objects are generated images, so shape, fill and stroke editing are hidden. What remains for
  // a placed object: arrange, transform, opacity, blend mode, adjustments, filter, effect, blur,
  // shadow, crop.
  cesdk.feature.enable(['ly.img.shape.options', 'ly.img.shape.options.*', 'ly.img.shape.edit', 'ly.img.replace.shape', 'ly.img.fill', 'ly.img.fill.*', 'ly.img.stroke', 'ly.img.stroke.*'], false);
  // The advanced editor adds a "Placeholder" tab for building templates; assets are not templates.
  cesdk.feature.enable(['ly.img.placeholder', 'ly.img.placeholder.*'], false);
  // #endregion

  // #region Inspector visibility
  // The advanced view keeps the inspector open as a "Document" panel while nothing is selected.
  // Here it only shows for a selected block. A parent feature counts as enabled while any of its
  // children is, hence the predicate goes on the inspector, its bar and its toggle.
  const blockSelected: FeaturePredicate = ({ engine }) => engine.block.findAllSelected().some((id) => engine.block.getType(id) !== '//ly.img.ubq/page');
  (['ly.img.inspector', 'ly.img.inspector.bar', 'ly.img.inspector.toggle'] as const).forEach((id) => cesdk.feature.set(id, blockSelected));
  // #endregion

  // #region Layer list
  // One tree of the page and its blocks with thumbnails; the page section and the entries for
  // adding pages are off because there is exactly one page.
  cesdk.feature.enable(['ly.img.layerList', 'ly.img.layerList.*']);
  cesdk.feature.enable(['ly.img.layerList.pages', 'ly.img.layerList.menu.page.addAbove', 'ly.img.layerList.menu.page.addBelow'], false);
  // #endregion
}
