import { OVERVIEW, type Vec3 } from './hotspots';
import { PALETTE } from './palette';

/**
 * The view out of the back-wall window: a low-poly city in front of two mountain ranges,
 * made of pure, seeded data so the scene stays deterministic and testable. The room's floor
 * is y = 0 and the back wall is the plane z = -3; the room sits several floors up, so the
 * street outside is GROUND_Y.
 *
 * The overview camera looks down through the window (about 3° to 13° below the horizontal),
 * so heights are chosen by the angle at which each rooftop or peak appears from that camera:
 * bottom to top, rooftops, then the ridge line, then sky.
 */
export const GROUND_Y = -14;
/** How far a ridge's mesh reaches forwards (towards the room) from its silhouette. */
export const RIDGE_DEPTH = 8;

const DEG = Math.PI / 180;
const EYE = OVERVIEW.position;

export interface Building {
  position: Vec3;
  size: Vec3;
  color: string;
}

export interface Ridge {
  /** Plane of the silhouette. */
  z: number;
  color: string;
  /** Silhouette points [x, y], left to right. */
  points: (readonly [number, number])[];
}

/** Angle of `to` above (positive) or below the horizontal plane through `from`, in radians. */
export function elevation(from: Vec3, to: Vec3): number {
  return Math.atan2(to[1] - from[1], Math.hypot(to[0] - from[0], to[2] - from[2]));
}

/** Angle around the vertical axis, 0 looking towards -z and positive towards +x, in radians. */
export function azimuth(from: Vec3, to: Vec3): number {
  return Math.atan2(to[0] - from[0], from[2] - to[2]);
}

/** Height y at which a point at floor position (x, z) appears `el` radians from the camera. */
function heightAt(x: number, z: number, el: number): number {
  return EYE[1] + Math.tan(el) * Math.hypot(x - EYE[0], z - EYE[2]);
}

/** mulberry32: a tiny deterministic PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BUILDING_COLORS = ['#d9d6cf', '#c9ccc8', '#b8bfc2', '#a9b2b8', '#e6e2da', '#9aa5ad', '#cfcac0', '#bcc3bd'];
const ACCENT_COLORS = [PALETTE.accentSoft, PALETTE.rug];
const ACCENT_CHANCE = 0.06;

interface Row {
  /** Front and back faces every building in the row stays between. */
  front: number;
  back: number;
  /** Rooftop elevation from the overview camera, in degrees. */
  roof: readonly [number, number];
  width: readonly [number, number];
  depth: readonly [number, number];
}

/** Back rows reach higher in the view, so they show above the front ones. */
const ROWS: readonly Row[] = [
  { front: -6, back: -11, roof: [-14.5, -10], width: [1.2, 2.4], depth: [1.2, 2.2] },
  { front: -12, back: -18, roof: [-12.5, -9], width: [1.4, 2.8], depth: [1.4, 2.4] },
  { front: -19.5, back: -26, roof: [-11, -8.3], width: [1.6, 3.2], depth: [1.5, 2.6] },
];
/** Spans what the window shows from the overview, its orbit and the desk close-ups. */
const CITY_X = [-22, 26] as const;

export function generateCity(seed: number): Building[] {
  const rand = mulberry32(seed);
  const between = ([lo, hi]: readonly [number, number]) => lo + rand() * (hi - lo);
  const buildings: Building[] = [];
  for (const row of ROWS) {
    let x = CITY_X[0] + rand();
    while (x < CITY_X[1]) {
      const w = between(row.width);
      const d = between(row.depth);
      const z = between([row.front - d / 2, row.back + d / 2]);
      const cx = x + w / 2;
      // The rooftop corner nearest the camera is the one that appears highest.
      const nearX = Math.min(Math.max(EYE[0], cx - w / 2), cx + w / 2);
      const top = heightAt(nearX, z + d / 2, between(row.roof) * DEG);
      const h = Math.max(2, top - GROUND_Y);
      const accent = rand() < ACCENT_CHANCE;
      const palette = accent ? ACCENT_COLORS : BUILDING_COLORS;
      const color = palette[Math.floor(rand() * palette.length)]!;
      buildings.push({ position: [cx, GROUND_Y + h / 2, z], size: [w, h, d], color });
      x += w + between([0.25, 1.1]);
    }
  }
  return buildings;
}

interface RangeSpec {
  z: number;
  color: string;
  /** Silhouette elevation from the overview camera, lowest to highest, in degrees. */
  elevation: readonly [number, number];
}

/**
 * Nearer range darker and greener, farther range lighter and bluer (distance faked with
 * colour). Both stay above the highest rooftop (-8.3°) and below the top of the opening
 * (about -3°), so the ridge line and some sky are always in the window.
 */
const RANGES: readonly RangeSpec[] = [
  { z: -64, color: '#a6b9c8', elevation: [-6.9, -3.8] },
  { z: -50, color: '#5f7f68', elevation: [-7.9, -4.9] },
];
const RIDGE_X = [-85, 95] as const;

export function generateRidge(seed: number): Ridge[] {
  const rand = mulberry32(seed ^ 0x9e3779b9);
  return RANGES.map((spec) => {
    const [p0, p1, p2] = [rand(), rand(), rand()].map((p) => p * Math.PI * 2) as [number, number, number];
    // Broad swells, sharper peaks (a triangle wave) and per-point jaggedness.
    const shape = (x: number) =>
      0.5 +
      0.2 * Math.sin(x * 0.17 + p0) +
      0.14 * Math.sin(x * 0.53 + p1) +
      0.16 * (1 - 4 * Math.abs((((x * 0.11 + p2 / (2 * Math.PI)) % 1) + 1) % 1 - 0.5));
    const [lo, hi] = spec.elevation;
    const points: (readonly [number, number])[] = [];
    for (let x = RIDGE_X[0]; x <= RIDGE_X[1]; x += 1.6 + rand() * 1.4) {
      const t = Math.min(1, Math.max(0, shape(x) + (rand() - 0.5) * 0.36));
      points.push([x, heightAt(x, spec.z, (lo + (hi - lo) * t) * DEG)]);
    }
    return { z: spec.z, color: spec.color, points };
  });
}

/**
 * Faceted triangles (x, y, z per vertex, counter-clockwise from the front) from a ridge's
 * silhouette down to below the ground: a row of shoulder points half-way down and towards
 * the room, then a base row under the street, so flat shading breaks it into facets.
 */
export function ridgeTriangles(ridge: Ridge): number[] {
  const { z, points } = ridge;
  const base = GROUND_Y - 1;
  const shoulders = points.slice(1).map(([x, y], i) => {
    const [px, py] = points[i]!;
    return [(px + x) / 2, base + (Math.min(py, y) - base) * 0.55] as const;
  });
  const top = ([x, y]: readonly [number, number]) => [x, y, z];
  const mid = ([x, y]: readonly [number, number]) => [x, y, z + RIDGE_DEPTH / 2];
  const bottom = ([x]: readonly [number, number]) => [x, base, z + RIDGE_DEPTH];
  const out: number[] = [];
  const tri = (...vs: number[][]) => {
    for (const v of vs) out.push(...v);
  };
  for (let i = 0; i < shoulders.length; i++) {
    const s = shoulders[i]!;
    tri(top(points[i]!), mid(s), top(points[i + 1]!));
    tri(mid(s), bottom(points[i]!), bottom(points[i + 1]!));
    if (i > 0) {
      const prev = shoulders[i - 1]!;
      tri(mid(prev), mid(s), top(points[i]!));
      tri(mid(prev), bottom(points[i]!), mid(s));
    }
  }
  return out;
}
