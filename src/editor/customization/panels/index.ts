/**
 * CUSTOMIZATION: the two tool panels
 *
 * "Hintergrund" and "Objekt erstellen" are custom panels: registered with
 * `cesdk.ui.registerPanel` and drawn with CE.SDK's builder API (`Section`, `Select`, `TextArea`,
 * `Button`, `Text`, `Library`). They contain no own markup or CSS, so they inherit the theme,
 * spacing, docking and keyboard behaviour of the stock panels.
 *
 *   background.ts     the Background tool
 *   createObject.ts   the Create Object tool
 *   shared.ts         model dropdown and generate state used by both
 *
 * To add a field to a tool, add a builder call in its render function. To add a tool, register
 * another panel here and give it a dock entry (../dock.ts).
 *
 * @see https://img.ly/docs/cesdk/js/user-interface/ui-extensions/create-custom-panel-d87b83/
 */
import type CreativeEditorSDK from '@cesdk/cesdk-js';
import { editorStore } from '../../store';
import { abortAllGenerations } from '../../variants';
import { BACKGROUND_PANEL, LAYERS_PANEL, OBJECT_PANEL } from '../ids';
import { registerBackgroundPanel } from './background';
import { registerCreateObjectPanel } from './createObject';

export function setupPanels(cesdk: CreativeEditorSDK): void {
  registerBackgroundPanel(cesdk);
  registerCreateObjectPanel(cesdk);

  // The tool panels and the layer list dock on the left, next to the dock, and share that slot
  // (see dock.ts). The inspector keeps the right side, as the starter kit sets it up.
  [BACKGROUND_PANEL, OBJECT_PANEL, LAYERS_PANEL].forEach((id) => {
    cesdk.ui.setPanelPosition(id, 'left');
    cesdk.ui.setPanelFloating(id, false);
  });

  // The workflow starts with a background, so that panel is open from the start.
  cesdk.ui.openPanel(BACKGROUND_PANEL);
}

/**
 * Keeps the area-marking mode in step with the Create Object panel: marking stops when the panel
 * closes. CE.SDK has no panel-closed event, so the state is polled. Returns the cleanup for the
 * editor's teardown, which also cancels running generations.
 */
export function watchPanels(cesdk: CreativeEditorSDK): () => void {
  const timer = setInterval(() => {
    if (editorStore.get().markArea && !cesdk.ui.isPanelOpen(OBJECT_PANEL)) editorStore.setMarkArea(false);
  }, 250);
  return () => {
    clearInterval(timer);
    abortAllGenerations();
    editorStore.setMarkArea(false);
  };
}
