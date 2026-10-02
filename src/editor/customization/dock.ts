/**
 * CUSTOMIZATION: dock
 *
 * The starter kit's dock opens asset libraries (templates, images, text ...). Here it holds the
 * two tools of the workflow and the layer list. All three entries are the stock dock button
 * (`ly.img.assetLibrary.dock`) with an own `onClick` that toggles a panel, the same pattern the
 * starter kit uses for its layer list entry (`src/imgly/config/ui/dock.ts`).
 *
 * To add a tool: register its panel in panels/, add the id to `LEFT_PANELS` and add an entry here.
 * Icons are CE.SDK's built-in set; own icons can be registered with `cesdk.ui.addIconSet`.
 *
 * @see https://img.ly/docs/cesdk/js/user-interface/customization/dock-cb916c/
 * @see https://img.ly/docs/cesdk/js/user-interface/appearance/icons-679e32/
 */
import type CreativeEditorSDK from '@cesdk/cesdk-js';
import { selectedTarget } from '@/editor/engine/blocks';
import { editorStore } from '../store';
import { BACKGROUND_PANEL, DOCK_LABEL, LAYERS_PANEL, OBJECT_PANEL } from './ids';

/** The left side holds one panel at a time: a tool panel or the layer list. */
const LEFT_PANELS = [BACKGROUND_PANEL, OBJECT_PANEL, LAYERS_PANEL];

function togglePanel(cesdk: CreativeEditorSDK, id: string): void {
  if (cesdk.ui.isPanelOpen(id)) {
    cesdk.ui.closePanel(id);
    return;
  }
  LEFT_PANELS.forEach((panel) => panel !== id && cesdk.ui.closePanel(panel));
  cesdk.ui.openPanel(id);
  // Opening Create Object without an area starts marking one right away.
  if (id === OBJECT_PANEL && selectedTarget(cesdk.engine) === null) editorStore.setMarkArea(true);
}

export function setupDock(cesdk: CreativeEditorSDK): void {
  const entry = (panel: string, icon: string, label: string) => ({
    id: 'ly.img.assetLibrary.dock',
    key: panel,
    icon,
    label,
    entries: [],
    isSelected: () => cesdk.ui.isPanelOpen(panel),
    onClick: () => togglePanel(cesdk, panel),
  });
  cesdk.ui.setComponentOrder({ in: 'ly.img.dock' }, [
    entry(BACKGROUND_PANEL, '@imgly/Image', DOCK_LABEL.background),
    entry(OBJECT_PANEL, '@imgly/FramePlus', DOCK_LABEL.object),
    { id: 'ly.img.separator', key: 'comic.dock.separator' },
    // 'component.layerList' is CE.SDK's own label for the layer list.
    entry(LAYERS_PANEL, '@imgly/Layers', 'component.layerList'),
  ]);
  // The starter kit hides the dock labels; with three entries there is room for them.
  cesdk.engine.editor.setSetting('dock/hideLabels', false);
}
