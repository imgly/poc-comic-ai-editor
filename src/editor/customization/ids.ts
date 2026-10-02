/**
 * CUSTOMIZATION: ids
 *
 * Ids of everything this PoC registers with CE.SDK, in one place.
 *
 * Custom ids carry the `comic.` prefix, so they are easy to tell apart from CE.SDK's own
 * `ly.img.*` ids when reading a component order or searching the code base.
 */

/** Panels registered by this PoC (`cesdk.ui.registerPanel`, see panels/). */
export const BACKGROUND_PANEL = 'comic.panel.background';
export const OBJECT_PANEL = 'comic.panel.object';

/** CE.SDK's stock layer list panel, which the PoC positions and toggles from the dock. */
export const LAYERS_PANEL = '//ly.img.panel/layers';

/** Canvas-menu components registered by this PoC (`cesdk.ui.registerComponent`, see canvas.ts). */
export const VARIANT_STEPPER = 'comic.variants.canvasMenu';
export const PLACE_OBJECT = 'comic.place.canvasMenu';

/** The counter button inside the variant stepper ("Variante 2 von 4"); theme.ts styles it as a label. */
export const VARIANT_STEPPER_LABEL = 'comic.variants.canvasMenu.label';

/** Translation keys for labels CE.SDK looks up itself (dock entries); registered in translations.ts. */
export const DOCK_LABEL = { background: 'comic.dock.background', object: 'comic.dock.object' } as const;
