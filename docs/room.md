# Phase 2: interactive 3D room

A low-poly work room. Clicking an object moves the camera to it and shows its content.
The simple mode (phase 1) is the same content as plain HTML and is always one click away.

## Principles

- Interactions first, models second. Build a blockout with primitives (boxes, cylinders)
  in React Three Fiber, validate camera moves and clicks, then swap each primitive for its model.
- One closed inventory (below). An object either has a job or it is not in the room.
- One base pack for a coherent style. Baked lighting in Blender, Draco geometry,
  KTX2/WebP textures.
- Every clickable object has an equivalent entry in a visible HTML menu, the same menu
  the simple mode uses: keyboard and screen-reader access, a way out for anyone who
  cannot find a hotspot, and one content source for both modes.
- A "View CV / simple mode" button is always visible.
- Loading target: 2–3 s behind a loading screen.

## Inventory

| Object | On click | Content | Source |
|---|---|---|---|
| Chair + monitor | Camera sits you in front of the screen | CV as real HTML (drei `<Html>`) | Kenney: `chairDesk`, `computerScreen`, `computerKeyboard`, `computerMouse` (desk: `desk`) |
| Bookshelf | Camera moves to the shelf | One book per project: Turnero, MonoGestor, jobradar | Kenney `bookcaseOpen` + `books` as filler; the 3 project books are boxes |
| Whiteboard | Front view | Skills grouped by area | Box + texture |
| Raspberry Pi | Zoom on the desk | Home server: hardware, Cloudflare Tunnel, what runs on it | Procedural (owner's Pi 5 in an Argon NEO 5 M.2 case) |
| Phone | Lifts towards the camera | Contact + CV download | Boxes |
| Mug | Short zoom on the desk | Education: Computer Engineering, UNT, 2019–2023 | Cylinders (+ logo decal later) |
| Lamp | Toggles on/off | Easter egg, or light/dark theme toggle | Kenney `lampRoundTable` |
| Window | Camera moves to the window | No panel: the city and mountains outside | Generated in code |
| Plant, rug, frame | — | Visual filler, not clickable | Kenney `pottedPlant`, `rugRectangle`; frame is boxes |

The mug carries a decal (transparent PNG) of the real "Ingeniería en Computación" mug logo.
The window view is daytime only; a night variant (lit windows, dark sky) is a future idea.

## Asset licenses

- Kenney and Quaternius: CC0.
- Poly Pizza: license per model; many are CC-BY and require attribution. Record every
  CC-BY asset in a credits section.

**Credits**: furniture models from the Furniture Kit 2.0 by Kenney (kenney.nl), CC0. The 10
source GLBs, as downloaded, are in `assets/models/kenney/` with the kit's `License.txt`;
`npm run models` (`scripts/models.mjs`, gltf-transform) writes the shipped copies to
`public/models/kenney/` with EXT_meshopt_compression (quantized, ~51 KB in all, decoded by
the WebAssembly inlined in the room chunk). They are recoloured to the site palette at load
time (`paletteFor` in `palette.ts`) and placed by `layout.ts`.

## Mobile

- The room opens by default on phones too (decided after the blockout; it replaced "phones
  start in simple mode"). Phones start simple only under the gate's exceptions below.
- Detect by capability, never by user agent: `(pointer: coarse)`, viewport width,
  WebGL availability, Save-Data, device memory.
- 3D on phones:
  - No hover: show visible pulsing markers on every clickable object.
  - The four desk objects share one "Desk" marker in the overview; it opens a desk view
    (no panel) where their own markers spread out. Back from a desk object opened there returns
    to the desk view; from the object menu it returns to the overview (`nav.ts`).
  - Invisible hit areas larger than the models (the Pi and the mug are tiny).
  - Camera FOV and position adapt to the aspect ratio (portrait frames the room differently).
  - Each hotspot has a portrait view (`viewFor(hotspot, aspect)`): the object sits in the upper
    ~45% of the screen, above the bottom sheet (max 55vh), via `panelShift('sheet', true)`.
  - Content opens in an HTML bottom sheet instead of inside the 3D scene
    (the CV on the monitor would be unreadable).
  - Lower device pixel ratio, no post-processing.
- Landscape tablets and desktops get the full experience.
- Taps and clicks share one code path (R3F pointer events).

## Architecture

The room mounts **on top of the simple page, at the same URL**. `/` and `/es/` stay the
static HTML they were in phase 1 (SEO, Open Graph previews, phones); the room is an overlay
that a small gate decides to open.

**Gate rules** (`src/lib/mode.ts`, `shouldAutoStartRoom`): the room auto-starts on every
device where WebGL works, phones included, except when the saved preference is `"simple"`,
the browser asks to save data (`navigator.connection.saveData`), or it reports less than
4 GB of memory (`navigator.deviceMemory`). Both signals exist only in Chromium browsers;
Safari and Firefox report neither and always get the room. The preference lives in
`localStorage.mode` (`"room"` | `"simple"`), every access in try/catch. Anyone who starts
simple can still open the room with the "View the 3D room" button.

**Loading path**

1. `GATE_SCRIPT` (inline in `<head>`, < 1.5 KB, built from the same constants and tested
   against `shouldAutoStartRoom`) sets `html[data-room="boot"]` before first paint, so the
   loading screen covers the page at once. The WebGL probe runs last, so phones and
   simple-mode visitors never create a context.
2. `src/room/boot.ts` (an Astro-processed `<script>`, ~1.5 KB gzip) shows the "View the 3D
   room" button when WebGL works, and starts the room when the gate said so or the button
   was pressed (that also saves `"room"`).
3. Only `start()` runs `import('./mount')`: Vite splits React, three, R3F, drei and GSAP into
   one lazy chunk. No HTML references it and there is no modulepreload for it. Its CSS is
   imported with `?inline` and injected on mount, so Astro does not link it from every page.
   `start()` also injects `<link rel="preload" as="fetch" crossorigin>` for the 10 GLBs, so they
   download alongside the chunk; drei's `useGLTF` then gets them from the preload (one request
   each). The loading bar turns determinate on the first progress event (items loaded / total,
   from three's loading manager) and `onReady` fires after the models load and the first full
   frame renders.
4. The import or WebGL failing (including errors inside the React tree, through
   `createRoot`'s `onUncaughtError`) logs to the console and silently restores the page.

JSX compiles through Vite's own transform (`tsconfig.json`: `"jsx": "react-jsx"`,
`"jsxImportSource": "react"`); `@astrojs/react` is not needed, because no Astro island is
hydrated.

**Overlay**: `#room-root` is a labelled `region` (not a modal dialog). While it is open every
other child of `<body>` is `inert` and the page does not scroll. "View CV / simple mode" is
always visible (also during loading): it saves `"simple"`, unmounts the React root (R3F
disposes the renderer and loses the context), removes the room styles, restores the page
and returns focus to the "View the 3D room" button.

**Inside the room**: OrbitControls with a tight orbit (no pan, clamped zoom) for the
overview; a hotspot click tweens camera and target with GSAP (1 s, `power2.inOut`; instant
under `prefers-reduced-motion`); Escape or "Back" returns. The HTML object menu lists every
hotspot plus the lamp toggle; it collapses to an "Objects" button (`menuLayout`) on touch or
narrow (< 768 px) screens and inside any view, and Escape closes the open list before the view. The monitor shows the CV as real HTML (drei `<Html transform
occlude>`); the window view (`{ kind: 'view' }`) opens nothing, focus waits on Back; every
other view opens a side panel, and on touch screens everything opens in
a bottom sheet, with pulsing markers, larger invisible hit areas, dpr [1, 1.5] and a wider
portrait camera. Desktop dpr is [1, 2]; no post-processing, no shadows yet.

**Files**

| File | Role |
|---|---|
| `src/lib/mode.ts` | Gate decision, constants, inline `GATE_SCRIPT` |
| `src/components/RoomGate.astro` | Overlay shell, loading screen, exit button, boot script |
| `src/room/boot.ts` | Enter/exit, inert page, focus, lazy import |
| `src/room/mount.tsx` | `createRoot` into the overlay; returns unmount |
| `src/room/RoomApp.tsx` | Canvas, object menu, Back, panel / bottom sheet |
| `src/room/Scene.tsx` | Blockout primitives, hover highlight, markers, monitor `<Html>` |
| `src/room/CameraRig.tsx` | Orbit limits, GSAP camera moves, panel-aware framing |
| `src/room/hotspots.ts` | Hotspots as data: objects, camera views, content, markers, books |
| `src/room/models.ts`, `layout.ts`, `assets.ts`, `progress.ts` | Model manifest; fitted placements and model geometry; useGLTF loading and progress for the loading screen |
| `src/room/piModel.ts`, `RaspberryPi.tsx` | The Pi as procedural parts (sizes, ports, its USB-C power cable to a brick in a wall socket under the desk; tested in Node) and its components |
| `src/room/nav.ts`, `menu.ts` | Back stack, desk group and which touch markers show; object menu layout |
| `src/room/city.ts`, `Outside.tsx` | Seeded city and mountain generators (pure, tested); the view through the window, drawn only inside a stencil mask of the opening |
| `src/room/panels.tsx` | Renders hotspot content from the en/es content objects |
| `src/room/palette.ts`, `room.css` | Blockout colours; room UI styles (site tokens) |

Room strings (labels, buttons, loading text, hotspot names) live in `en.ts`/`es.ts` under
`room`, typed by `RoomUi` in `profile.ts`; the content itself is never duplicated.
