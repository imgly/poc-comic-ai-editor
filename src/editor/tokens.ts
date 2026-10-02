/**
 * CUSTOMIZATION: design tokens for the engine
 *
 * The engine draws on the canvas with RGB values between 0 and 1 and cannot read CSS variables,
 * so the few colours it needs are repeated here. Keep them in sync with the `--cs-*` tokens in
 * `src/app/globals.css`.
 */

/** `--cs-accent` (#8cbcff): selection frame, guides, the rectangle of an object area. */
export const ACCENT = { r: 0.549, g: 0.737, b: 1 };

/** `--cs-card` (#252525): the empty page before it gets a background. */
export const EMPTY_PAGE = { r: 0.145, g: 0.145, b: 0.145 };
