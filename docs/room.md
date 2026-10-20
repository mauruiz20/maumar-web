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
| Chair + monitor | Camera sits you in front of the screen | CV as real HTML (drei `<Html>`) | Kenney |
| Bookshelf | Camera moves to the shelf | One book per project: Turnero, MonoGestor, jobradar | Kenney |
| Whiteboard | Front view | Skills grouped by area | Box + texture |
| Raspberry Pi | Zoom on the desk | Home server: hardware, Cloudflare Tunnel, what runs on it | Modelled by Mauricio |
| Phone | Lifts towards the camera | Contact + CV download | Kenney or Quaternius |
| Mug | Short zoom on the desk | Education: Computer Engineering, UNT, 2019–2023 | Kenney or Quaternius + logo decal |
| Lamp | Toggles on/off | Easter egg, or light/dark theme toggle | Kenney |
| Window | — | Decoration: low-poly city and mountains outside (daytime) | Generated in code |
| Plant, rug, frame | — | Visual filler, not clickable | Kenney |

The mug carries a decal (transparent PNG) of the real "Ingeniería en Computación" mug logo.
The window view is daytime only; a night variant (lit windows, dark sky) is a future idea.

## Asset licenses

- Kenney and Quaternius: CC0.
- Poly Pizza: license per model; many are CC-BY and require attribution. Record every
  CC-BY asset in a credits section.
- Confirm the exact contents of the Kenney Furniture Kit before committing to it.

## Mobile

- Phones start in simple mode, with a "View the 3D room" button to opt in.
- Detect by capability, never by user agent: `(pointer: coarse)`, viewport width,
  WebGL availability.
- Opt-in 3D on phones:
  - No hover: show visible pulsing markers on every clickable object.
  - Invisible hit areas larger than the models (the Pi and the mug are tiny).
  - Camera FOV and position adapt to the aspect ratio (portrait frames the room differently).
  - Content opens in an HTML bottom sheet instead of inside the 3D scene
    (the CV on the monitor would be unreadable).
  - Lower device pixel ratio, no post-processing.
- Landscape tablets and desktops get the full experience.
- Taps and clicks share one code path (R3F pointer events).

## Architecture

The room mounts **on top of the simple page, at the same URL**. `/` and `/es/` stay the
static HTML they were in phase 1 (SEO, Open Graph previews, phones); the room is an overlay
that a small gate decides to open.

**Gate rules** (`src/lib/mode.ts`, `shouldAutoStartRoom`): auto-start only when the
viewport is at least 1024 px wide, `(pointer: fine)` matches, WebGL works, and the saved
preference is not `"simple"`. The preference lives in `localStorage.mode`
(`"room"` | `"simple"`), every access in try/catch. A saved `"room"` never auto-starts on a
phone; there the "View the 3D room" button is the way in.

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
hotspot plus the lamp toggle. The monitor shows the CV as real HTML (drei `<Html transform
occlude>`); every other view opens a side panel, and on touch screens everything opens in
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
| `src/room/city.ts`, `Outside.tsx` | Seeded city and mountain generators (pure, tested); the view through the window, drawn only inside a stencil mask of the opening |
| `src/room/panels.tsx` | Renders hotspot content from the en/es content objects |
| `src/room/palette.ts`, `room.css` | Blockout colours; room UI styles (site tokens) |

Room strings (labels, buttons, loading text, hotspot names) live in `en.ts`/`es.ts` under
`room`, typed by `RoomUi` in `profile.ts`; the content itself is never duplicated.
