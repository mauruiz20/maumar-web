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
| Window | — | Decoration (Tucumán sky, day/night) | Box + texture |
| Plant, rug, frame | — | Visual filler, not clickable | Kenney |

The mug carries a decal (transparent PNG) of the real "Ingeniería en Computación" mug logo.

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
