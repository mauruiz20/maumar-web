import { Box3, Matrix4, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { generateCity, generateRidge, GROUND_Y } from '../src/room/city';
import { DESK, DESK_ITEMS, DESK_TOP, WINDOW } from '../src/room/hotspots';
import { MODEL_BOUNDS, PLACEMENTS, placedBounds } from '../src/room/layout';
import { PALETTE } from '../src/room/palette';
import { PI_PLACEMENT } from '../src/room/piModel';
import { SHADOWS, shadowCamera, shadowPlane, type ShadowSpec } from '../src/room/shadows';

const RUG_TOP = placedBounds(MODEL_BOUNDS.rugRectangle, PLACEMENTS.rugRectangle).max[1];

/** The world box the shadow camera captures: the plane's rectangle, from it up to `far`. */
function captureBox(s: ShadowSpec) {
  const [cx, cz] = s.center;
  const [w, d] = s.size;
  return { min: [cx - w / 2, s.y, cz - d / 2], max: [cx + w / 2, s.y + s.far, cz + d / 2] };
}

/** Inside, allowing the centimetre the floor rectangle keeps clear of the walls. */
const WALL_GAP = 0.011;
type Box = { min: readonly number[]; max: readonly number[] };
const inside = (b: Box, rect: Box) =>
  b.min[0]! >= rect.min[0]! - WALL_GAP &&
  b.max[0]! <= rect.max[0]! + WALL_GAP &&
  b.min[2]! >= rect.min[2]! - WALL_GAP &&
  b.max[2]! <= rect.max[2]! + WALL_GAP;

describe('shadow planes', () => {
  it('sit just above their surfaces: over the rug on the floor, over the desk top', () => {
    expect(SHADOWS.floor.y).toBeGreaterThan(RUG_TOP);
    expect(SHADOWS.floor.y - RUG_TOP).toBeLessThanOrEqual(0.005);
    expect(SHADOWS.desk.y).toBeGreaterThan(DESK_TOP);
    expect(SHADOWS.desk.y - DESK_TOP).toBeLessThanOrEqual(0.005);
    // Far enough apart from the surface not to z-fight (0.5 mm or more).
    expect(SHADOWS.floor.y - RUG_TOP).toBeGreaterThanOrEqual(0.0005);
    expect(SHADOWS.desk.y - DESK_TOP).toBeGreaterThanOrEqual(0.0005);
  });

  it('cover the footprints of what they shade', () => {
    const floor = captureBox(SHADOWS.floor);
    for (const id of ['desk', 'chairDesk', 'bookcaseOpen', 'pottedPlant', 'rugRectangle'] as const) {
      expect(inside(placedBounds(MODEL_BOUNDS[id], PLACEMENTS[id]), floor), id).toBe(true);
    }
    const desk = captureBox(SHADOWS.desk);
    for (const id of ['computerScreen', 'computerKeyboard', 'computerMouse', 'lampRoundTable'] as const) {
      expect(inside(placedBounds(MODEL_BOUNDS[id], PLACEMENTS[id]), desk), id).toBe(true);
    }
    for (const [id, item] of Object.entries(DESK_ITEMS)) {
      const [x, z] = item.at;
      const r = item.radius;
      expect(inside({ min: [x - r, 0, z - r], max: [x + r, 0, z + r] }, desk), id).toBe(true);
    }
    const [px, , pz] = PI_PLACEMENT.position;
    expect(inside({ min: [px - 0.06, 0, pz - 0.06], max: [px + 0.06, 0, pz + 0.06] }, desk)).toBe(true);
    // The desk shadow is the desk top, no wider.
    expect(SHADOWS.desk.center).toEqual([...DESK.center]);
    expect(SHADOWS.desk.size).toEqual([...DESK.size]);
  });

  it('never capture the outside: the city, the mountains, the ground, the sky or the window', () => {
    const boxes = [captureBox(SHADOWS.floor), captureBox(SHADOWS.desk)];
    for (const b of boxes) {
      // Inside the room: in front of the back wall (z = -3) and right of the left wall (x = -3).
      expect(b.min[2]).toBeGreaterThan(-3);
      expect(b.min[0]).toBeGreaterThan(-3);
      expect(b.min[1]).toBeGreaterThan(GROUND_Y);
      // The sky sphere (150 m) and the window glass (z = -3) are outside every box.
      expect(Math.hypot(Math.max(...b.max.map(Math.abs)), Math.max(...b.min.map(Math.abs)))).toBeLessThan(150);
    }
    const nearestBuilding = Math.max(...generateCity(7).map((c) => c.position[2] + c.size[2] / 2));
    const nearestRidge = Math.max(...generateRidge(7).map((r) => r.z));
    for (const b of boxes) {
      expect(b.min[2]).toBeGreaterThan(nearestBuilding);
      expect(b.min[2]).toBeGreaterThan(nearestRidge);
    }
    // The desk shadow's box stays below the window's sill.
    const deskBox = captureBox(SHADOWS.desk);
    expect(deskBox.min[2]).toBeGreaterThan(-3 + 0.05);
    expect(WINDOW.center[1] - WINDOW.size[1] / 2).toBeGreaterThan(0);
  });

  it('use modest resolutions, soft blur and the ink colour at low opacity', () => {
    expect(SHADOWS.floor.resolution).toBeLessThanOrEqual(512);
    expect(SHADOWS.desk.resolution).toBeLessThanOrEqual(256);
    for (const s of [SHADOWS.floor, SHADOWS.desk]) {
      expect(s.color).toBe(PALETTE.ink);
      expect(s.opacity).toBeGreaterThan(0.2);
      expect(s.opacity).toBeLessThanOrEqual(0.7);
      expect(s.blur).toBeGreaterThan(0);
    }
  });
});

describe('shadow camera and plane', () => {
  it.each(['floor', 'desk'] as const)('maps the %s camera image back onto the plane at the same spot', (key) => {
    const spec = SHADOWS[key];
    const camera = shadowCamera(spec);
    const { geometry, matrix } = shadowPlane(spec);
    const pos = geometry.getAttribute('position');
    const uv = geometry.getAttribute('uv');
    const world = (i: number) => new Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(matrix);
    // Bilinear map uv -> world from the plane's four corners.
    const corners = [0, 1, 2, 3].map((i) => ({ u: uv.getX(i), v: uv.getY(i), p: world(i) }));
    const at = (u: number, v: number) => {
      const pick = (cu: number, cv: number) => corners.find((c) => c.u === cu && c.v === cv)!.p;
      const a = pick(0, 0).clone().lerp(pick(1, 0), u);
      const b = pick(0, 1).clone().lerp(pick(1, 1), u);
      return a.lerp(b, v);
    };
    const [cx, cz] = spec.center;
    for (const [dx, dz] of [
      [0.2, 0.1],
      [-0.3, 0.25],
      [0.1, -0.2],
    ]) {
      const p = new Vector3(cx + dx * spec.size[0], spec.y + 0.05, cz + dz * spec.size[1]);
      const ndc = p.clone().project(camera);
      const onPlane = at((ndc.x + 1) / 2, (ndc.y + 1) / 2);
      expect(onPlane.x).toBeCloseTo(p.x, 6);
      expect(onPlane.z).toBeCloseTo(p.z, 6);
      expect(onPlane.y).toBeCloseTo(spec.y, 6);
      // Above the plane, within far: inside the depth range.
      expect(ndc.z).toBeGreaterThan(-1);
      expect(ndc.z).toBeLessThan(1);
    }
    // Below the plane is never captured.
    expect(new Vector3(cx, spec.y - 0.01, cz).project(camera).z).toBeLessThan(-1);
    // The plane covers exactly the spec's rectangle.
    const box = new Box3().setFromBufferAttribute(pos as never).applyMatrix4(new Matrix4().copy(matrix));
    expect(box.max.x - box.min.x).toBeCloseTo(spec.size[0], 6);
    expect(box.max.z - box.min.z).toBeCloseTo(spec.size[1], 6);
  });
});
