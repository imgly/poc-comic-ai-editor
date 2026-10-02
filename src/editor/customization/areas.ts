/**
 * CUSTOMIZATION: object areas keep their aspect ratio
 *
 * An area (the empty rectangle an object is generated into) snaps to an aspect ratio when it is
 * drawn (`src/editor/AreaOverlay.tsx`) and must keep it afterwards, because the ratio is what the
 * model is asked for. CE.SDK has no per-block ratio lock, so two stock switches are bound to the
 * selection:
 *
 *  - the edge handles are hidden while an area is selected; the corner handles remain and scale
 *    proportionally,
 *  - the width and height inputs of the inspector are off for areas.
 *
 * Placed objects (an area that received an image) are regular image blocks and keep all handles.
 *
 * @see https://img.ly/docs/cesdk/js/settings-970c98/
 */
import type CreativeEditorSDK from '@cesdk/cesdk-js';
import { roleOf } from '../blocks';

export function setupAreas(cesdk: CreativeEditorSDK): void {
  const { engine } = cesdk;
  const areaSelected = () => {
    const selected = engine.block.findAllSelected();
    return selected.length === 1 && roleOf(engine, selected[0]) === 'area';
  };
  let edgeHandles: 'never' | 'auto' = 'auto';
  const update = () => {
    const next = areaSelected() ? 'never' : 'auto';
    if (next === edgeHandles) return;
    edgeHandles = next;
    engine.editor.setSetting('controlGizmo/resizeHandlesVisibility', next);
  };
  engine.block.onSelectionChanged(update);
  // An area turns into an object while it stays selected (a variant is placed), so block changes
  // are watched as well.
  engine.event.subscribe([], update);
  // `isPreviousEnable` keeps whatever the starter kit decided for every other block.
  cesdk.feature.set('ly.img.transform.size', ({ isPreviousEnable }) => isPreviousEnable() && !areaSelected());
}
