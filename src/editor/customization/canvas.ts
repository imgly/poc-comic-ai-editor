/**
 * CUSTOMIZATION: canvas bar and canvas menu
 *
 * The canvas menu is the context menu that floats next to the selected block. Like every CE.SDK
 * UI area it is an ordered list of component ids. Two own components are registered here and
 * placed into that list:
 *
 *  - the variant stepper for the page:  ‹  Variante 2 von 4  ›  [Übernehmen]
 *  - "Objekt platzieren" for a placed object, in front of the stock entries
 *
 * Things worth knowing when changing this file:
 *
 *  - Canvas-menu components are built with the builder API. The menu renders buttons and
 *    dropdowns; `builder.Text` is ignored there.
 *  - They re-render on engine events, not on component state. What should update the menu is
 *    therefore written to block metadata (the variant list, a flag when "Place object" starts and
 *    ends): writing metadata is an engine event.
 *  - A component order can only be filtered by edit mode, not by block type. To give the page its
 *    own menu, the order is swapped whenever the selection changes.
 *  - A button with icon and label loses its label when space is tight; label-only buttons keep it.
 *
 * @see https://img.ly/docs/cesdk/js/user-interface/customization/canvas-menu-0d2b5b/
 * @see https://img.ly/docs/cesdk/js/user-interface/ui-extensions/register-new-component-b04a04/
 */
import type CreativeEditorSDK from '@cesdk/cesdk-js';
import { placeObject } from '../ai/placeObject';
import { acceptBackgroundVariant, backgroundVariants, stepBackgroundVariant } from '../backgroundVariants';
import { isPlacing, selectedObject, selectedPage, setPlacing } from '../blocks';
import { t } from '../i18n';
import { PLACE_OBJECT, VARIANT_STEPPER, VARIANT_STEPPER_LABEL } from './ids';

/** Menu of the selected page: the variant stepper only (it renders nothing without variants). */
const PAGE_MENU = [VARIANT_STEPPER];

/** Menu of a selected block: "Place object", then the starter kit's entries for image blocks. */
const BLOCK_MENU = [
  PLACE_OBJECT,
  'ly.img.separator',
  'ly.img.group.enter.canvasMenu',
  'ly.img.group.select.canvasMenu',
  'ly.img.separator',
  'ly.img.replace.canvasMenu',
  'ly.img.separator',
  'ly.img.bringForward.canvasMenu',
  'ly.img.sendBackward.canvasMenu',
  'ly.img.separator',
  'ly.img.duplicate.canvasMenu',
  'ly.img.delete.canvasMenu',
  'ly.img.separator',
  'ly.img.options.canvasMenu',
];

export function setupCanvasMenu(cesdk: CreativeEditorSDK): void {
  const { engine } = cesdk;

  // The bar below the canvas (document settings, "add page" in the starter kit) is not needed.
  cesdk.ui.setComponentOrder({ in: 'ly.img.canvas.bar', at: 'bottom' }, []);

  registerVariantStepper(cesdk);
  registerPlaceObject(cesdk);

  const setMenu = (forPage: boolean) => cesdk.ui.setComponentOrder({ in: 'ly.img.canvas.menu', when: { editMode: 'Transform' } }, forPage ? PAGE_MENU : BLOCK_MENU);
  setMenu(false);
  engine.block.onSelectionChanged(() => setMenu(selectedPage(engine) !== null));
}

/**
 * Variant stepper: shown on the page while background variants are up for selection. The state
 * (image URIs, shown index, total) is kept in the page's metadata, see backgroundVariants.ts.
 */
function registerVariantStepper(cesdk: CreativeEditorSDK): void {
  cesdk.ui.registerComponent(VARIANT_STEPPER, ({ builder, engine }) => {
    const page = selectedPage(engine);
    const variants = page !== null ? backgroundVariants(engine, page) : null;
    if (page === null || variants === null || variants.uris.length === 0) return;
    const { index, uris, total, loading } = variants;
    const atEnd = index >= uris.length - 1;
    // The handlers read the current state again instead of using `index` from this render: on
    // fast clicks the menu has not re-rendered yet.
    builder.Button(`${VARIANT_STEPPER}.previous`, {
      icon: '@imgly/ChevronLeft',
      tooltip: t('variant.previous'),
      isDisabled: index === 0,
      onClick: () => stepBackgroundVariant(engine, page, -1),
    });
    // The counter is a button without an action; theme.ts takes away its pointer behaviour.
    builder.Button(VARIANT_STEPPER_LABEL, { label: t('variant.label', { index: index + 1, total }), onClick: () => undefined });
    builder.Button(`${VARIANT_STEPPER}.next`, {
      icon: '@imgly/ChevronRight',
      tooltip: t('variant.next'),
      // A spinner while the next variant is still being generated.
      isLoading: atEnd && loading,
      isDisabled: atEnd,
      onClick: () => stepBackgroundVariant(engine, page, 1),
    });
    builder.Button(`${VARIANT_STEPPER}.accept`, {
      label: t('variant.accept'),
      tooltip: t('variant.accept.tooltip'),
      color: 'accent',
      onClick: () => acceptBackgroundVariant(engine, page),
    });
  });
}

/**
 * "Place object": bakes the selected object into the background with AI-adjusted lighting and
 * shadow (see ai/placeObject.ts). While it runs, the button is a spinner and a loading
 * notification reports the step.
 */
function registerPlaceObject(cesdk: CreativeEditorSDK): void {
  cesdk.ui.registerComponent(PLACE_OBJECT, ({ builder, engine }) => {
    const object = selectedObject(engine);
    if (object === null) return;
    const busy = isPlacing(object);
    builder.Button(`${PLACE_OBJECT}.button`, {
      label: busy ? t('place.busy') : t('place'),
      tooltip: t('place.tooltip'),
      color: 'accent',
      isLoading: busy,
      isDisabled: busy,
      onClick: async () => {
        if (isPlacing(object)) return;
        setPlacing(engine, object, true);
        const notification = cesdk.ui.showNotification({ message: t('place.progress.render'), type: 'loading', duration: 'infinite' });
        try {
          await placeObject(engine, object, (step) => cesdk.ui.updateNotification(notification, { message: t(`place.progress.${step}`) }));
          cesdk.ui.dismissNotification(notification);
          cesdk.ui.showNotification({ message: t('place.done'), type: 'success', duration: 'medium' });
        } catch (err) {
          cesdk.ui.dismissNotification(notification);
          cesdk.ui.showNotification({ message: (err as Error).message ?? String(err), type: 'error', duration: 'long' });
        } finally {
          setPlacing(engine, object, false);
        }
      },
    });
  });
}
