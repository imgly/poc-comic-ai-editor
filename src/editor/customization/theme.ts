/**
 * CUSTOMIZATION: theme
 *
 * The look is applied on three levels, from the most to the least official:
 *
 *  1. CE.SDK theme variables (`--ubq-*`): surfaces, accent, text, borders, radii, font. This is
 *     the regular theming API and plain CSS; it lives in `src/app/globals.css`, driven by the
 *     `--cs-*` design tokens at the top of that file. Change a token there to recolour the editor
 *     and the React screens (start, loading, login) together.
 *  2. Engine settings, in `setupTheme` below: colours the engine draws on the canvas itself
 *     (selection frame, snapping guides). Their values are in `src/editor/tokens.ts`.
 *  3. A few CSS rules injected into the editor's shadow root, `SHADOW_CSS` below: shapes the theme
 *     variables do not cover (pill-shaped primary buttons and canvas menu). These go beyond the
 *     public theming API: they match CE.SDK's class names, so re-check them when updating the SDK.
 *     Removing them only changes those shapes back to the stock rounded rectangles.
 *
 * @see https://img.ly/docs/cesdk/js/user-interface/appearance/theming-4b0938/
 * @see https://img.ly/docs/cesdk/js/settings-970c98/
 */
import type CreativeEditorSDK from '@cesdk/cesdk-js';
import { ACCENT } from '../tokens';
import { VARIANT_STEPPER_LABEL } from './ids';

/**
 * CE.SDK's class names carry a build hash (`UBQ_Button-module__ubq-color_accent--7FCPT`), so the
 * rules match on the stable part of the name. `data-cy` holds the id a component was built with.
 */
const SHADOW_CSS = `
  /* Primary buttons are pills. */
  [class*="UBQ_Button-module__ubq-color_accent"] { border-radius: 999px; }
  /* So is the canvas menu, with round buttons inside. */
  [class*="UBQ_CanvasMenu-module__block"] { border-radius: 999px; padding: 4px; gap: 2px; }
  [class*="UBQ_CanvasMenu-module__block"] > button { border-radius: 999px; }
  [class*="UBQ_CanvasMenu-module__block"] > [class*="ubq-color_accent"] { padding-inline: 14px; }
  /* The counter of the variant stepper is a label, not a control. */
  [data-cy$="${VARIANT_STEPPER_LABEL}"] { pointer-events: none; font-variant-numeric: tabular-nums; }
`;

export function setupTheme(cesdk: CreativeEditorSDK): void {
  const { engine } = cesdk;

  // The stock dark theme is the base; globals.css recolours it.
  cesdk.ui.setTheme('dark');

  // Selection frame and guides in the accent colour. The handles stay white: the rotate handle
  // draws its icon in the highlight colour and would disappear on an accent fill.
  const accent = { ...ACCENT, a: 1 };
  engine.editor.setSetting('highlightColor', accent);
  engine.editor.setSetting('placeholderHighlightColor', accent);
  engine.editor.setSetting('snappingGuideColor', accent);
  engine.editor.setSetting('rotationSnappingGuideColor', accent);

  // CE.SDK renders its UI into the shadow root of `#root-shadow`.
  const root = document.querySelector('#root-shadow')?.shadowRoot;
  if (root && !root.querySelector('style[data-comic-theme]')) {
    const style = document.createElement('style');
    style.dataset.comicTheme = '';
    style.textContent = SHADOW_CSS;
    root.appendChild(style);
  }
}
