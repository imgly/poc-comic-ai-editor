# Customization guide

This document shows where the editor differs from a stock CE.SDK editor, which CE.SDK mechanism
each difference uses, and how to change it. Every file named here starts with a comment that
repeats the essentials, and the customization files are marked with `CUSTOMIZATION` in their
header, so a search for that word lists them all.

## The three layers

| Layer | Where | What it is |
| --- | --- | --- |
| 1. Base configuration | `src/imgly/config/` | The configuration of IMG.LY's [Advanced Design Editor starter kit](https://github.com/imgly/starterkit-advanced-design-editor-ts-web) for CE.SDK 1.83.0, copied **unmodified**. It sets up the full advanced editor: features, UI layout, actions, keyboard shortcuts, engine settings. |
| 2. Customizations | `src/editor/customization/` and `src/app/globals.css` | Everything this PoC changes about the stock editor. Applied on top of layer 1 through public CE.SDK APIs, one file per part of the editor. |
| 3. Own UI | `src/editor/*.tsx`, `src/app/` | React screens and overlays around and on top of the editor: start, loading and login screen, header, the area overlays on the canvas. Not CE.SDK, but styled with the same design tokens. |

Keeping layer 1 untouched has a practical benefit: when IMG.LY updates the starter kit, the folder
can be replaced with the new version and compared file by file. Nothing in it has to be merged.

The entry point of layer 2 is `setupEditor` in
[`src/editor/customization/index.ts`](src/editor/customization/index.ts). It adds the starter kit
plugin, then calls one setup function per file. Reading that function top to bottom gives the
complete list of customizations.

## Map

| What you see | Mechanism | File | Typical change |
| --- | --- | --- | --- |
| Colours, radii, font of the editor | CE.SDK theme variables (`--ubq-*`) | [`src/app/globals.css`](src/app/globals.css) | Edit a `--cs-*` token at the top of the file |
| Selection frame and guide colours | Engine settings | [`customization/theme.ts`](src/editor/customization/theme.ts), [`tokens.ts`](src/editor/tokens.ts) | Change `ACCENT` in `tokens.ts` |
| Pill-shaped primary buttons and canvas menu | CSS injected into the editor's shadow root | [`customization/theme.ts`](src/editor/customization/theme.ts) | Edit or remove `SHADOW_CSS` |
| German UI | `cesdk.i18n.setLocale`, `setTranslations` | [`customization/translations.ts`](src/editor/customization/translations.ts), [`i18n.ts`](src/editor/i18n.ts) | Edit texts in `i18n.ts`; `NEXT_PUBLIC_UI_LOCALE=en` for English |
| Single page, trimmed inspector, inspector only with a selection, layer list | Feature API (`cesdk.feature.enable` / `set`) | [`customization/features.ts`](src/editor/customization/features.ts) | Delete a line to bring a stock feature back |
| Top bar: undo/redo, zoom, export | Component order of `ly.img.navigation.bar` | [`customization/navigationBar.ts`](src/editor/customization/navigationBar.ts) | Reorder, add or remove component ids |
| Dock with Hintergrund, Objekt erstellen, Ebenen | Component order of `ly.img.dock`, stock dock button with own `onClick` | [`customization/dock.ts`](src/editor/customization/dock.ts) | Add an entry for a new tool |
| Panels "Hintergrund" and "Objekt erstellen" | Custom panels: `cesdk.ui.registerPanel` + builder API | [`customization/panels/`](src/editor/customization/panels/) | Add builder calls to a panel's render function |
| `‹ Variante 2 von 4 › Übernehmen` on the page | Custom component in `ly.img.canvas.menu` | [`customization/canvas.ts`](src/editor/customization/canvas.ts), [`backgroundVariants.ts`](src/editor/backgroundVariants.ts) | Edit `registerVariantStepper` |
| "Objekt platzieren" on a placed object | Custom component in `ly.img.canvas.menu` | [`customization/canvas.ts`](src/editor/customization/canvas.ts), [`ai/placeObject.ts`](src/editor/ai/placeObject.ts) | Edit `registerPlaceObject`, `BLOCK_MENU` |
| Object areas keep their aspect ratio | Engine setting and feature predicate bound to the selection | [`customization/areas.ts`](src/editor/customization/areas.ts) | — |
| Drag-to-mark rectangle with ratio snapping, ratio strip, area tag | Own React overlay on top of the canvas | [`AreaOverlay.tsx`](src/editor/AreaOverlay.tsx), [`ratios.ts`](src/editor/ratios.ts) | Edit `RATIOS`; restyle the overlay |
| Start screen, loading screen, header | Own React UI | [`StartScreen.tsx`](src/editor/StartScreen.tsx), [`EditorHost.tsx`](src/editor/EditorHost.tsx) | Plain React and Tailwind classes |
| Login screen | Own React UI plus Next.js proxy | [`src/app/login/`](src/app/login/), [`src/proxy.ts`](src/proxy.ts) | See README, "Password protection" |
| Models, prompts, generation | IMG.LY AI Gateway | [`ai/gateway.ts`](src/editor/ai/gateway.ts), panels | See "AI" below |

All ids the PoC registers with CE.SDK carry the prefix `comic.` and are collected in
[`customization/ids.ts`](src/editor/customization/ids.ts). CE.SDK's own ids start with `ly.img.`.

## Theme

The look is applied on three levels, from the most to the least official.

**1. Theme variables.** CE.SDK reads its colours, radii and typography from CSS variables named
`--ubq-*`. `globals.css` defines a small set of design tokens (`--cs-canvas`, `--cs-panel`,
`--cs-accent`, `--cs-text`, …) and maps them onto the CE.SDK variables. The React screens use the
same tokens, so one change recolours the whole app:

```css
:root {
  --cs-accent: #8cbcff;      /* primary buttons, selection, active states */
  --cs-on-accent: #0d1522;   /* text on the accent */
  --cs-panel: #222222;       /* panels and bars */
}
```

CE.SDK applies the variables through classes on the container around the editor (`ubq-dark`,
`ubq-modern`, `ubq-static`). The rules in `globals.css` use the more specific selector
`.cesdk-host .ubq-dark`, which is all that is needed to override the stock values. The stock
values are listed in `node_modules/@cesdk/cesdk-js/assets/ui/stylesheets/cesdk-themes.css`.

The font is loaded in `src/app/layout.tsx` with `next/font` and handed to CE.SDK through
`--ubq-typography-font_family`.

**2. Engine settings.** The selection frame and the snapping guides are drawn by the engine on the
canvas, not by CSS. `setupTheme` sets them with `engine.editor.setSetting('highlightColor', …)`.
The engine cannot read CSS variables, so the two colours it needs are repeated as RGB values in
`src/editor/tokens.ts`; keep them in sync with the `--cs-*` tokens.

**3. Shadow-root CSS.** Two shapes are not covered by theme variables: pill-shaped primary buttons
and the pill-shaped canvas menu. `theme.ts` injects a handful of CSS rules into the editor's
shadow root for them. This is the one place where the styling goes beyond the public theming API:
the rules match CE.SDK's class names (`[class*="UBQ_Button-module__ubq-color_accent"]`), which can
change between SDK versions. Check them after an SDK update. Deleting `SHADOW_CSS` is safe and
only returns those elements to the stock rounded rectangles.

Docs: [Theming](https://img.ly/docs/cesdk/js/user-interface/appearance/theming-4b0938/)

## Language

`src/editor/i18n.ts` holds the texts the PoC adds, in German and English, and exports `t(key)`.
The default prompts in the two panels are the one exception; they are German.
CE.SDK's own UI is switched with `cesdk.i18n.setLocale`. Two kinds of labels are looked up by
CE.SDK itself and are therefore registered as translations in `translations.ts`: dock labels and
panel titles (the title of a panel is the translation of `panel.<panel id>`). Any stock label can
be replaced the same way; the keys are in `node_modules/@cesdk/cesdk-js/assets/i18n/en.json`.

Docs: [Localization](https://img.ly/docs/cesdk/js/user-interface/localization-508e20/)

## Features

CE.SDK's UI consists of features that can be enabled, disabled or bound to a condition.
`features.ts` changes four things compared to the starter kit:

- **Single page.** Adding and resizing pages is off; the page title is hidden.
- **Inspector content.** Shape, fill and stroke editing and the template "Placeholder" tab are off.
  A placed object keeps arrange, transform, opacity, blend mode, adjustments, filter, effect, blur,
  shadow and crop.
- **Inspector visibility.** The advanced view shows a "Document" inspector while nothing is
  selected. A predicate limits the inspector to selected blocks:

  ```ts
  cesdk.feature.set('ly.img.inspector', ({ engine }) => engine.block.findAllSelected().some(/* not the page */));
  ```

  A parent feature counts as enabled while any child is, so the predicate is set on
  `ly.img.inspector`, `ly.img.inspector.bar` and `ly.img.inspector.toggle`.
- **Layer list.** All layer list features are on, including thumbnails; the page section is off.

The complete list of feature ids, with a comment each, is in `src/imgly/config/features.ts`.

Docs: [Disable or enable features](https://img.ly/docs/cesdk/js/user-interface/customization/disable-or-enable-f058e2/)

## Navigation bar and dock

Every UI area of CE.SDK is an ordered list of component ids, set with
`cesdk.ui.setComponentOrder({ in: '<area>' }, [...])`. The navigation bar and the dock only
rearrange stock components.

The dock entries are the stock dock button `ly.img.assetLibrary.dock` with an own `onClick` that
toggles a panel. The starter kit uses the same pattern for its layer list entry. To add a tool:

1. Register its panel in `customization/panels/` and add the id to `ids.ts`.
2. Add the id to `LEFT_PANELS` in `dock.ts`, so the left side keeps showing one panel at a time.
3. Add `entry(<panel id>, '<icon>', '<label key>')` to the component order.

Docs: [Dock](https://img.ly/docs/cesdk/js/user-interface/customization/dock-cb916c/),
[Navigation bar](https://img.ly/docs/cesdk/js/user-interface/customization/navigation-bar-4e5d39/),
[Icons](https://img.ly/docs/cesdk/js/user-interface/appearance/icons-679e32/)

## Custom panels

"Hintergrund" and "Objekt erstellen" are registered with `cesdk.ui.registerPanel(id, render)`. The
render function describes the panel with CE.SDK's builder API:

```ts
cesdk.ui.registerPanel(BACKGROUND_PANEL, ({ builder, engine, state }) => {
  const prompt = state('prompt', DEFAULT_PROMPT);
  builder.Section('form', {
    children: () => {
      builder.TextArea('prompt', { inputLabel: 'Prompt', value: prompt.value, setValue: prompt.setValue });
      builder.Button('generate', { label: 'Generieren', color: 'accent', onClick: () => { /* … */ } });
    },
  });
});
```

The panels contain no markup or CSS of their own. They inherit the theme, spacing, docking and
keyboard handling of the stock panels, which is why they look native. The render function runs
again when engine state it reads or a `state` value changes. Asynchronous work (loading the
model list, generating) re-renders the panel by bumping a counter state; see `useRefresh` in
`panels/shared.ts`.

The four object variants are shown with `builder.Library`, the stock asset library component, fed
by a local asset source per area (`src/editor/variants.ts`).

Docs: [Create a custom panel](https://img.ly/docs/cesdk/js/user-interface/ui-extensions/create-custom-panel-d87b83/)

## Canvas menu

The context menu next to the selected block gets two custom components, registered with
`cesdk.ui.registerComponent` in `canvas.ts`: the variant stepper for the page and "Objekt
platzieren" for placed objects. Four things are worth knowing:

- **Buttons, no text.** The canvas menu renders buttons and dropdowns; `builder.Text` is ignored
  there. The counter "Variante 2 von 4" is a button without an action, turned into a label by one
  CSS rule in `theme.ts`.
- **State lives in block metadata.** Canvas-menu components re-render when engine state that
  their render function has read changes, not on component state. The variant list
  (`comic/variants` on the page) and the busy flag of "Place object" (`comic/busy` on the object)
  are therefore written to block metadata, and the render function reads them. A write to
  metadata the render function never read does not update the menu.
- **One menu per block type.** A component order can be filtered by edit mode but not by block
  type. To give the page its own menu, `canvas.ts` swaps the order between `PAGE_MENU` and
  `BLOCK_MENU` whenever the selection changes.
- **Labels.** A button with icon and label drops the label when space is tight. The two primary
  actions are label-only for that reason.

Docs: [Canvas menu](https://img.ly/docs/cesdk/js/user-interface/customization/canvas-menu-0d2b5b/),
[Register a new component](https://img.ly/docs/cesdk/js/user-interface/ui-extensions/register-new-component-b04a04/)

## Object areas and the canvas overlays

An **area** is the empty rectangle an object is generated into. In the engine it is a graphic
block tagged with metadata `comic/role = area`; when a variant is placed, the block gets the image
as its fill and the tag `object` (`src/editor/blocks.ts`).

Drawing an area is the one interaction CE.SDK has no stock tool for, so it is an own React overlay
on top of the canvas ([`AreaOverlay.tsx`](src/editor/AreaOverlay.tsx)):

- It is active only while the "Objekt erstellen" panel waits for an area.
- Pointer positions are converted to page pixels with the page's screen rectangle, which the
  engine reports through `engine.block.getScreenSpaceBoundingBoxXYWH`.
- While dragging, `snapArea` (`src/editor/ratios.ts`) picks the nearest of the ten aspect ratios
  and returns the largest rectangle with that ratio inside the dragged box.
- On release, `createAreaBlock` creates the block. From then on it is a regular CE.SDK block with
  the stock selection, handles, inspector and layer list entry.

`AreaTag` in the same file shows ratio and size on the selected area.

The overlay has to know which part of the editor is free canvas, without dock and panels. It finds
that element inside the editor's shadow root by class name (`findCanvasElements`). Like the
shadow-root CSS, this relies on CE.SDK's markup and should be checked after an SDK update.

After drawing, the area keeps its ratio (`customization/areas.ts`): while an area is selected, the
edge handles are hidden through the engine setting `controlGizmo/resizeHandlesVisibility`, which
leaves the proportional corner handles, and the inspector's width and height inputs are disabled
through the feature `ly.img.transform.size`.

To change the ratios on offer, edit `RATIOS` in `ratios.ts`. The start screen, the snapping, the
ratio strip and the size dropdown of the panel all read that list.

## Start, loading and login screen

These are plain React components with Tailwind classes that reference the `--cs-*` tokens, for
example `bg-(--cs-card)`. They are not part of CE.SDK. The loading screen in `EditorHost.tsx`
stays on top of the editor until `setupEditor` has finished, so CE.SDK's own loading state is
never visible. CE.SDK boots in its light theme for a moment before `setTheme('dark')` runs;
`globals.css` therefore applies the theme colours to `.ubq-light` as well.

## AI

| What | Where |
| --- | --- |
| Gateway client: model list, schema handling, upload, generation, background removal | [`src/editor/ai/gateway.ts`](src/editor/ai/gateway.ts) |
| Short-lived browser tokens; the API key stays on the server | [`src/app/api/ai/token/route.ts`](src/app/api/ai/token/route.ts) |
| Default models | `DEFAULT_MODEL` in `gateway.ts`, or the `NEXT_PUBLIC_IMGLY_AI_*` variables |
| Number of variants, default prompts | `VARIANT_COUNT`, `DEFAULT_PROMPT` in `panels/background.ts` and `panels/createObject.ts` |
| Style instruction appended to every object prompt | `STYLE_INSTRUCTION` in `panels/createObject.ts` |
| "Place object": render, crop, prompt, compositing | [`src/editor/ai/placeObject.ts`](src/editor/ai/placeObject.ts) |
| Mock generation without a key | [`src/editor/ai/mock.ts`](src/editor/ai/mock.ts) |

The gateway client reads each model's input schema to find the prompt, image and aspect-ratio
fields, so new gateway models appear in the dropdowns without code changes. The object dropdown
lists only image-to-image models that accept a prompt and a reference image.

## Beyond the public API

Three spots rely on CE.SDK internals rather than documented APIs. All three are small, isolated
and commented in the code:

| Spot | File | Depends on |
| --- | --- | --- |
| Pill shapes | `customization/theme.ts`, `SHADOW_CSS` | CE.SDK class names |
| Free canvas area for the overlays | `AreaOverlay.tsx`, `findCanvasElements` | CE.SDK class name `Editor-module__canvasContainer` |
| Injecting the style element | `customization/theme.ts` | The editor's shadow host `#root-shadow` |

Everything else uses documented APIs: theme variables, `setTheme`, `setLocale`,
`setTranslations`, `feature.enable` / `feature.set`, `setComponentOrder`, `registerPanel`,
`registerComponent`, the builder API, panel positioning, engine settings and block metadata.

## Updating CE.SDK or the starter kit

1. Raise `@cesdk/cesdk-js` and `@imgly/plugin-ai-generation-web` in `package.json` to the same
   version.
2. Optionally replace `src/imgly/config/` with the starter kit's `src/imgly/config/` of that
   version. The kit pins its behaviour with `cesdk.setEditorCompatibilityVersion(...)` in
   `plugin.ts`, so an SDK update without this step keeps the editor behaving as before.
3. Run `npm run typecheck` and `npm run lint`.
4. Check the three spots listed under "Beyond the public API" in the running editor.
