/**
 * CUSTOMIZATION: navigation bar
 *
 * The top bar is an ordered list of stock components. Compared to the starter kit
 * (`src/imgly/config/ui/navigationBar.ts`) the document settings and the preview toggle are gone
 * and an export menu is added. Reorder, remove or add ids to change it.
 *
 * @see https://img.ly/docs/cesdk/js/user-interface/customization/navigation-bar-4e5d39/
 */
import type CreativeEditorSDK from '@cesdk/cesdk-js';

export function setupNavigationBar(cesdk: CreativeEditorSDK): void {
  cesdk.ui.setComponentOrder({ in: 'ly.img.navigation.bar' }, [
    'ly.img.undoRedo.navigationBar',
    'ly.img.spacer',
    'ly.img.title.navigationBar',
    'ly.img.spacer',
    'ly.img.zoom.navigationBar',
    // Export uses CE.SDK's stock actions (see src/imgly/config/actions.ts).
    { id: 'ly.img.actions.navigationBar', children: ['ly.img.exportImage.navigationBar', 'ly.img.exportPDF.navigationBar'] },
  ]);
}
