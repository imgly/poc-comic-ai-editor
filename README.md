# Comic Studio · AI comic asset editor

A proof of concept for an editor that creates comic-style assets with AI: generate a background,
generate objects in the style of that background, place them, and export the result. It is built
on [IMG.LY CE.SDK](https://img.ly/creative-sdk) 1.83 and uses as much of the stock editor UI as
possible. The base is IMG.LY's
[Advanced Design Editor starter kit](https://github.com/imgly/starterkit-advanced-design-editor-ts-web);
everything on top of it is a customization through public CE.SDK APIs.

**[CUSTOMIZATION.md](CUSTOMIZATION.md) explains where each customization lives and how to change it.**

## Workflow

1. **Canvas.** On the start screen, pick one of ten aspect ratios and an image size (1, 2 or 4
   megapixels). The editor opens with one empty page of that size.
2. **Background.** The "Hintergrund" panel is open from the start: choose a model, write a prompt,
   generate. Four variants are generated. The first one that arrives appears on the page; the
   page's context menu steps through them (`‹ Variante 2 von 4 ›`) and "Übernehmen" keeps the
   shown one.
3. **Object.** Open "Objekt erstellen" and drag a rectangle on the page. It snaps to the nearest
   aspect ratio; a strip above the page shows which one. Write a prompt and generate. The page
   background is sent to the model as the style reference, and the four variants come back
   without a background. Clicking a variant places it in the area.
4. **Arrange.** A placed object is a regular image block: move, scale, rotate, crop, filter,
   reorder in the layer list ("Ebenen").
5. **Place object.** "Objekt platzieren" in the object's context menu bakes it into the
   background: the AI adjusts the lighting and adds a shadow. The object is then part of the
   picture. Undo restores it.
6. **Export.** PNG or PDF through the export menu in the top bar.

## Getting started

Requires Node.js 22 or newer.

```bash
npm install
cp .env.example .env.local   # then fill in the values, see below
npm run dev                  # http://localhost:3000
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_CESDK_LICENSE` | yes | CE.SDK license key. |
| `IMGLY_AI_GATEWAY_API_KEY` | no | IMG.LY AI Gateway key, used on the server only. Without it the editor runs in **mock mode**: images are drawn locally, so the workflow can be clicked through without a key. |
| `SITE_PASSWORD` | no | Password for the whole site. Empty: no login screen. See "Password protection". |
| `IMGLY_AI_GATEWAY_URL` | no | Gateway base URL. Default `https://gateway.img.ly`. |
| `NEXT_PUBLIC_IMGLY_AI_DEFAULT_IMAGE_MODEL` | no | Text-to-image model preselected for backgrounds. Default `bfl/flux-2-pro`. |
| `NEXT_PUBLIC_IMGLY_AI_DEFAULT_EDIT_MODEL` | no | Image-to-image model preselected for objects. Default `google/nano-banana-2-edit`. |
| `NEXT_PUBLIC_IMGLY_AI_PLACE_MODEL` | no | Image-to-image model for "Place object". Default: the object model. |
| `NEXT_PUBLIC_UI_LOCALE` | no | `de` (default) or `en`. |

Variables starting with `NEXT_PUBLIC_` are compiled into the browser bundle; the others stay on
the server.

Other scripts: `npm run build`, `npm run start`, `npm run lint`, `npm run typecheck`.

## Password protection

With `SITE_PASSWORD` set, every page and API route requires a login. Visitors are redirected to
`/login`; after entering the password they get an httpOnly session cookie that lasts 30 days. The
cookie holds a hash derived from the password, so changing the password ends all sessions.

- [`src/proxy.ts`](src/proxy.ts) checks every request (Next.js "proxy", formerly middleware).
- [`src/lib/sitePassword.ts`](src/lib/sitePassword.ts) holds the hashing and comparison.
- [`src/app/login/`](src/app/login/) and [`src/app/api/login/route.ts`](src/app/api/login/route.ts)
  are the screen and the check.

The gate also covers `/api/ai/token`, so AI Gateway tokens cannot be requested without the
password. It is a shared password for a private demo, not user management. For production, put
your own authentication in front of the app and of the token route.

## Project structure

```
src/
├── proxy.ts                      Password gate
├── lib/
│   ├── i18n.ts                   All texts, German and English
│   └── sitePassword.ts           Password hashing and session check
├── app/                          Next.js App Router: routes only
│   ├── layout.tsx                Font, metadata
│   ├── globals.css               Design tokens and the CE.SDK theme
│   ├── page.tsx                  Start screen or editor
│   ├── login/                    Login screen
│   └── api/
│       ├── login/route.ts        Password check, session cookie
│       └── ai/token/route.ts     Short-lived AI Gateway tokens
├── components/                   The app's own screens around the editor
│   ├── StartScreen.tsx           Canvas ratio and size
│   ├── EditorHost.tsx            Header, editor container, overlays
│   └── LoadingScreen.tsx
├── imgly/config/                 Starter kit configuration, unmodified
└── editor/
    ├── Editor.tsx                Mounts CE.SDK, runs the setup
    ├── customization/            Everything that changes the stock editor
    │   ├── index.ts              Entry point: setupEditor()
    │   ├── ids.ts                Ids of all custom panels and components
    │   ├── theme.ts              Canvas colours, shapes
    │   ├── translations.ts       Language
    │   ├── features.ts           Feature switches
    │   ├── navigationBar.ts      Top bar
    │   ├── dock.ts               Dock entries
    │   ├── canvas.ts             Context menu: variant stepper, "Place object"
    │   ├── areas.ts              Ratio lock of object areas
    │   └── panels/               The two tool panels (builder API)
    ├── overlays/                 React layers on top of the canvas
    │   ├── AreaOverlay.tsx       Drag-to-mark with ratio snapping
    │   ├── AreaTag.tsx           Ratio and size on the selected area
    │   └── canvasFrame.ts        Screen position of canvas and blocks
    ├── engine/                   How the PoC's concepts map onto CE.SDK blocks
    │   ├── scene.ts              The initial scene: one empty page
    │   ├── blocks.ts             Page, areas, objects
    │   ├── backgroundVariants.ts Background variants up for selection
    │   └── objectVariants.ts     Object variants as thumbnails
    ├── ai/
    │   ├── gateway.ts            IMG.LY AI Gateway client
    │   ├── generateVariants.ts   Parallel generation of variants
    │   ├── placeObject.ts        "Place object"
    │   └── mock.ts               Local generation without a key
    ├── ratios.ts                 Aspect ratios, page sizes, snapping
    ├── tokens.ts                 Engine-side copies of the colour tokens
    └── store.ts                  Shared state between panels and overlays
```

## How it is built

- **Base.** `src/imgly/config/` is the starter kit's configuration for CE.SDK 1.83.0, copied
  without changes. `src/editor/customization/index.ts` adds it as a plugin and then applies the
  customizations, one file per part of the editor.
- **Stock UI.** The dock, panels, context menu, inspector, layer list and export are CE.SDK's own
  components. The two tool panels are custom panels drawn with CE.SDK's builder API, so they
  inherit theme and behaviour. Only one interaction has no stock equivalent and is an own React
  overlay: drawing an object area with ratio snapping.
- **Look.** Colours, radii and font are CE.SDK theme variables, set in `globals.css` from a small
  set of design tokens that the React screens share.
- **AI.** The browser asks `/api/ai/token` for a short-lived token and talks to the IMG.LY AI
  Gateway directly. The gateway client reads each model's input schema, so models can be switched
  in the dropdowns. Objects are made transparent with a model's native option where it has one,
  otherwise with the gateway's background-removal model.

## Deployment

The app is a standard Next.js application. On Vercel, set the variables from the table above in
the project settings (at least `NEXT_PUBLIC_CESDK_LICENSE`, `IMGLY_AI_GATEWAY_API_KEY` and
`SITE_PASSWORD`) and deploy. `NEXT_PUBLIC_*` values are read at build time, so changing one needs
a new build.

## Limits of this proof of concept

- **Generated images live in the browser.** Variants are held as in-memory blob URLs. They are
  gone after a reload, and a saved scene would not find them again. A product would upload each
  accepted image to its own storage and reference that URL.
- **CE.SDK assets load from the IMG.LY CDN.** For production, host the engine and UI assets
  yourself and set `baseURL` (see `src/editor/Editor.tsx` and the starter kit's README).
- **"Place object" sends a crop around the object to the model** and pastes the answer back. On
  very flat backgrounds the edited region can show a faint tonal difference, and models
  sometimes move an object that floats in the air onto a surface.
- **Three spots rely on CE.SDK internals** (the shadow-root CSS for pill shapes, its injection,
  and locating the canvas area for the overlay). They are listed in CUSTOMIZATION.md and should
  be checked on SDK updates.
- **No automated tests.** The PoC was verified by hand in the browser.
