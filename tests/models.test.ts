import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BOOKS, DESK, DESK_TOP } from '../src/room/hotspots';
import {
  BOOKCASE_SHELVES,
  CV_SCREEN,
  LAMP_BULB,
  MODEL_BOUNDS,
  PLACEMENTS,
  SCREEN_FACE,
  applyPlacement,
  placeModel,
  placedBounds,
} from '../src/room/layout';
import { MODEL_FILES, MODEL_IDS, modelUrl, type ModelId } from '../src/room/models';
import { PALETTE, paletteFor } from '../src/room/palette';
import { createProgressRelay } from '../src/room/progress';
import { getBounds, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { bounds, readGlb, triangles, upwardSurfaces, type Triangle } from './helpers/glb';

/** Shipped (meshopt-compressed) files, and the uncompressed Kenney sources they are built from. */
const DIR = join(import.meta.dirname, '..', 'public', 'models', 'kenney');
const SRC = join(import.meta.dirname, '..', 'assets', 'models', 'kenney');
const shipped = (id: ModelId) => join(DIR, MODEL_FILES[id]);
/** Geometry tests read the sources: same geometry, no decoder needed. */
const glb = (id: ModelId) => join(SRC, MODEL_FILES[id]);
const close = (a: number, b: number, tol: number) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);

describe('models manifest', () => {
  it('lists files that exist, and nothing else in the folder', () => {
    for (const id of MODEL_IDS) expect(existsSync(shipped(id)), id).toBe(true);
    const glbs = readdirSync(DIR).filter((f) => f.endsWith('.glb')).sort();
    expect(glbs).toEqual(MODEL_IDS.map((id) => MODEL_FILES[id]).sort());
  });

  it('keeps a source for every shipped model, with the license', () => {
    for (const id of MODEL_IDS) expect(existsSync(glb(id)), id).toBe(true);
    expect(existsSync(join(SRC, 'License.txt'))).toBe(true);
  });

  it('ships meshopt-compressed files (no Draco, no textures)', () => {
    for (const id of MODEL_IDS) {
      const { json } = readGlb(shipped(id)) as unknown as { json: { extensionsRequired?: string[]; images?: unknown[] } };
      expect(json.extensionsRequired, id).toContain('EXT_meshopt_compression');
      expect(json.extensionsRequired, id).not.toContain('KHR_draco_mesh_compression');
      expect(json.images ?? [], id).toEqual([]);
    }
  });

  it('keeps the shipped models under 60 KB in total', () => {
    const total = MODEL_IDS.reduce((sum, id) => sum + statSync(shipped(id)).size, 0);
    expect(total).toBeLessThan(60 * 1024);
  });

  it('decodes each shipped model to the source geometry (within quantization)', async () => {
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
    await MeshoptDecoder.ready;
    for (const id of MODEL_IDS) {
      const doc = await io.read(shipped(id));
      const b = getBounds(doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0]!);
      const source = bounds(triangles(glb(id)));
      const tol = Math.max(...[0, 1, 2].map((k) => source.max[k]! - source.min[k]!)) / 1000;
      for (let k = 0; k < 3; k++) {
        close(b.min[k]!, source.min[k]!, Math.max(tol, 1e-4));
        close(b.max[k]!, source.max[k]!, Math.max(tol, 1e-4));
      }
    }
  });

  it('ships the CC0 license next to the models', () => {
    expect(existsSync(join(DIR, 'License.txt'))).toBe(true);
  });

  it('builds same-origin URLs under /models/kenney/', () => {
    expect(modelUrl('desk')).toBe('/models/kenney/desk.glb');
    for (const id of MODEL_IDS) expect(modelUrl(id)).toMatch(/^\/models\/kenney\/[\w]+\.glb$/);
  });
});

describe('paletteFor', () => {
  it('maps Kenney material names to site palette keys', () => {
    expect(paletteFor('wood')).toBe('wood');
    expect(paletteFor('metalDark')).toBe('ink');
    expect(paletteFor('plant')).toBe('leaf');
    expect(paletteFor('carpetWhite')).toBe('paper');
  });

  it('lets a model override the default for a material', () => {
    expect(paletteFor('wood', 'bookcaseOpen')).toBe('woodLight');
    expect(paletteFor('metal', 'computerScreen')).toBe('inkSoft');
    expect(paletteFor('carpet', 'chairDesk')).toBe('inkSoft');
    expect(paletteFor('carpet', 'rugRectangle')).toBe('rug');
    expect(paletteFor('lamp', 'lampRoundTable')).toBe('accent');
  });

  it('falls back to a muted colour for unknown names', () => {
    expect(paletteFor('somethingNew')).toBe('muted');
    expect(paletteFor('', 'desk')).toBe('muted');
    expect(paletteFor('constructor', 'toString')).toBe('muted');
  });

  it('covers every material in the shipped models with a real palette colour', () => {
    for (const id of MODEL_IDS) {
      for (const name of new Set(triangles(glb(id)).map((t) => t.material))) {
        expect(PALETTE[paletteFor(name, id)], `${id}/${name}`).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });
});

describe('model bounds', () => {
  it('match the GLB files (the layout constants were derived from them once)', () => {
    for (const id of MODEL_IDS) {
      const b = bounds(triangles(glb(id)));
      for (let k = 0; k < 3; k++) {
        close(MODEL_BOUNDS[id].min[k]!, b.min[k]!, 1e-3);
        close(MODEL_BOUNDS[id].max[k]!, b.max[k]!, 1e-3);
      }
    }
  });
});

describe('placeModel', () => {
  const box = { min: [0, 0, -1] as const, max: [2, 1, 0] as const };

  it('puts the scaled footprint centre and the bottom at the anchor', () => {
    const p = placeModel(box, { at: [5, 1, 5], scale: 2 });
    const b = placedBounds(box, p);
    expect(b.min).toEqual([3, 1, 4]);
    expect(b.max).toEqual([7, 3, 6]);
  });

  it('fits a world size, swapping width and depth on a quarter turn', () => {
    const p = placeModel(box, { at: [0, 0, 0], size: [1, 2, 4], turns: 1 });
    const b = placedBounds(box, p);
    for (const [k, size] of [1, 2, 4].entries()) close(b.max[k]! - b.min[k]!, size, 1e-9);
  });

  it('turns +z (the Kenney front) towards +x on a quarter turn', () => {
    const p = placeModel(box, { at: [0, 0, 0], scale: 1, turns: 1 });
    const front = applyPlacement([1, 0.5, 0], p);
    const back = applyPlacement([1, 0.5, -1], p);
    expect(front[0]).toBeGreaterThan(back[0]);
  });
});

function placedTriangles(id: keyof typeof PLACEMENTS & ModelId): Triangle[] {
  const p = PLACEMENTS[id];
  const at = (v: Triangle['a']) => [...applyPlacement(v, p)] as Triangle['a'];
  return triangles(glb(id)).map((t) => ({ ...t, a: at(t.a), b: at(t.b), c: at(t.c) }));
}

describe('fitted layout', () => {
  it('fits the desk to the DESK footprint and DESK_TOP within 1 cm', () => {
    const b = bounds(placedTriangles('desk'));
    close(b.min[0], DESK.center[0] - DESK.size[0] / 2, 0.01);
    close(b.max[0], DESK.center[0] + DESK.size[0] / 2, 0.01);
    close(b.min[2], DESK.center[1] - DESK.size[1] / 2, 0.01);
    close(b.max[2], DESK.center[1] + DESK.size[1] / 2, 0.01);
    close(b.min[1], 0, 0.001);
    close(b.max[1], DESK_TOP, 0.01);
    // The top surface itself (not just the bounds) is at DESK_TOP.
    const top = upwardSurfaces(placedTriangles('desk')).at(-1)!;
    close(top.y, DESK_TOP, 0.01);
  });

  it('stands everything on the desk or the floor, inside the room', () => {
    for (const id of ['computerScreen', 'computerKeyboard', 'computerMouse', 'lampRoundTable'] as const) {
      close(bounds(placedTriangles(id)).min[1], DESK_TOP, 0.002);
    }
    for (const id of ['chairDesk', 'bookcaseOpen', 'pottedPlant', 'rugRectangle', 'desk'] as const) {
      const b = bounds(placedTriangles(id));
      close(b.min[1], 0, 0.002);
      expect(b.min[0], id).toBeGreaterThanOrEqual(-3);
      expect(b.min[2], id).toBeGreaterThanOrEqual(-3);
    }
  });

  it('sizes the chair like an office chair, tucked in front of the desk', () => {
    const tris = placedTriangles('chairDesk');
    const b = bounds(tris);
    const seat = upwardSurfaces(tris).reduce((best, s) => (s.area > best.area ? s : best));
    expect(seat.y).toBeGreaterThan(0.38);
    expect(seat.y).toBeLessThan(0.47);
    expect(b.max[1]).toBeGreaterThan(0.95);
    expect(b.max[1]).toBeLessThan(1.06);
    close(b.max[0] - b.min[0], 0.6, 0.02);
    // In front of the desk, not under or behind the room's front edge of it.
    expect(b.min[2]).toBeGreaterThan(DESK.center[1] + DESK.size[1] / 2 - 0.05);
    expect(b.max[2]).toBeLessThan(-1.2);
  });

  it('derives the bookcase shelves from the model', () => {
    const shelves = upwardSurfaces(triangles(glb('bookcaseOpen')))
      .filter((s) => s.area > 0.05)
      .map((s) => s.y);
    expect(BOOKCASE_SHELVES).toEqual(shelves);
  });

  it('stands the three clickable books on a real shelf, inside the bookcase', () => {
    const placedShelves = upwardSurfaces(placedTriangles('bookcaseOpen'))
      .filter((s) => s.area > 0.1)
      .map((s) => s.y);
    const b = bounds(placedTriangles('bookcaseOpen'));
    for (const book of BOOKS) {
      const bottom = book.position[1] - book.size[1] / 2;
      expect(Math.min(...placedShelves.map((y) => Math.abs(y - bottom))), book.project).toBeLessThan(0.003);
      for (const k of [0, 2]) {
        expect(book.position[k]! - book.size[k]! / 2, book.project).toBeGreaterThan(b.min[k]!);
        expect(book.position[k]! + book.size[k]! / 2, book.project).toBeLessThan(b.max[k]!);
      }
    }
  });

  it('matches the screen face constants to the monitor model', () => {
    const face = bounds(triangles(glb('computerScreen')).filter((t) => t.material === 'metal'));
    for (let k = 0; k < 3; k++) {
      close(Math.min(SCREEN_FACE.bottomLeft[k]!, SCREEN_FACE.topRight[k]!), face.min[k]!, 1e-3);
      close(Math.max(SCREEN_FACE.bottomLeft[k]!, SCREEN_FACE.topRight[k]!), face.max[k]!, 1e-3);
    }
  });

  it('lays the CV <Html> on the screen face: centred, parallel, the same size', () => {
    const p = PLACEMENTS.computerScreen;
    const bl = applyPlacement(SCREEN_FACE.bottomLeft, p);
    const tr = applyPlacement(SCREEN_FACE.topRight, p);
    const centre = bl.map((v, k) => (v + tr[k]!) / 2);
    // Within 5 mm of the face centre (it floats 2 mm in front of it).
    expect(Math.hypot(...CV_SCREEN.position.map((v, k) => v - centre[k]!))).toBeLessThan(0.005);
    // Tilted back like the face: the top is further from the room than the bottom.
    const tilt = Math.atan2(bl[2] - tr[2], tr[1] - bl[1]);
    close(-CV_SCREEN.rotation[0], tilt, 0.01);
    // 640 x 384 CSS px at drei's 1 px = distanceFactor / 400 m: as wide as the face.
    const width = (640 * CV_SCREEN.distanceFactor) / 400;
    close(width, tr[0] - bl[0], 0.005);
    expect((384 * CV_SCREEN.distanceFactor) / 400).toBeLessThanOrEqual(Math.hypot(tr[1] - bl[1], tr[2] - bl[2]));
  });

  it('puts the lamp light inside the shade', () => {
    const shade = bounds(placedTriangles('lampRoundTable').filter((t) => t.material === 'lamp'));
    for (let k = 0; k < 3; k++) {
      expect(LAMP_BULB[k]).toBeGreaterThan(shade.min[k]!);
      expect(LAMP_BULB[k]).toBeLessThan(shade.max[k]!);
    }
  });
});

describe('createProgressRelay', () => {
  it('reports loaded / total as a fraction and replays the last value to new listeners', () => {
    const relay = createProgressRelay();
    relay.report(1, 4);
    const seen: number[] = [];
    relay.subscribe((f) => seen.push(f));
    relay.report(2, 4);
    expect(seen).toEqual([0.25, 0.5]);
  });

  it('never goes backwards (the total can grow while loading) and clamps to 0..1', () => {
    const relay = createProgressRelay();
    const seen: number[] = [];
    relay.subscribe((f) => seen.push(f));
    relay.report(3, 4);
    relay.report(3, 6);
    relay.report(9, 6);
    relay.report(1, 0);
    expect(seen).toEqual([0.75, 1]);
  });

  it('stops calling a listener after unsubscribe', () => {
    const relay = createProgressRelay();
    const seen: number[] = [];
    const off = relay.subscribe((f) => seen.push(f));
    off();
    relay.report(1, 2);
    expect(seen).toEqual([]);
  });
});
