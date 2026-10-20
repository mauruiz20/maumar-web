import { describe, expect, it } from 'vitest';
import {
  GROUND_Y,
  RIDGE_DEPTH,
  azimuth,
  elevation,
  generateCity,
  generateRidge,
  ridgeTriangles,
  type Building,
  type Ridge,
} from '../src/room/city';
import { OVERVIEW, WINDOW, hotspotById, type Vec3 } from '../src/room/hotspots';

const EYE = OVERVIEW.position;
const DEG = Math.PI / 180;

describe('elevation and azimuth', () => {
  it('measure the angle above the horizontal and around the vertical axis', () => {
    expect(elevation([0, 0, 0], [0, 1, -1])).toBeCloseTo(45 * DEG);
    expect(elevation([0, 2, 0], [3, 2, -4])).toBeCloseTo(0);
    expect(elevation([0, 0, 0], [0, -1, -1])).toBeCloseTo(-45 * DEG);
    expect(azimuth([0, 0, 0], [0, 0, -5])).toBeCloseTo(0);
    expect(azimuth([0, 0, 0], [1, 0, -1])).toBeCloseTo(45 * DEG);
    expect(azimuth([0, 0, 0], [-1, 5, -1])).toBeCloseTo(-45 * DEG);
  });
});

interface Sight {
  az: number;
  el: number;
}

/** Sight lines from a camera (the overview by default) through a grid of points on the window opening. */
function sightLines(eye: Vec3 = EYE, n = 9): Sight[] {
  const [cx, cy] = WINDOW.center;
  const [w, h] = WINDOW.size;
  const out: Sight[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const p: Vec3 = [cx - w / 2 + (w * i) / (n - 1), cy - h / 2 + (h * j) / (n - 1), -3];
      out.push({ az: azimuth(eye, p), el: elevation(eye, p) });
    }
  }
  return out;
}

/** Highest elevation of the ridges at an azimuth, interpolated between silhouette points. */
function ridgeElevation(ridges: Ridge[], az: number, eye: Vec3 = EYE): number {
  let best = -Infinity;
  for (const r of ridges) {
    const pts = r.points.map(([x, y]): Sight => {
      const p: Vec3 = [x, y, r.z];
      return { az: azimuth(eye, p), el: elevation(eye, p) };
    });
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]!;
      const b = pts[i]!;
      if (az < Math.min(a.az, b.az) || az > Math.max(a.az, b.az)) continue;
      const t = (az - a.az) / (b.az - a.az || 1);
      best = Math.max(best, a.el + t * (b.el - a.el));
    }
  }
  return best;
}

/** Highest rooftop elevation among the buildings covering an azimuth (-Infinity if none). */
function roofElevation(city: Building[], az: number, eye: Vec3 = EYE): number {
  let best = -Infinity;
  for (const b of city) {
    const [x, y, z] = b.position;
    const [w, h, d] = b.size;
    const corners = [-1, 1].flatMap((sx) => [-1, 1].map((sz): Vec3 => [x + (sx * w) / 2, y + h / 2, z + (sz * d) / 2]));
    const azs = corners.map((c) => azimuth(eye, c));
    if (az < Math.min(...azs) || az > Math.max(...azs)) continue;
    best = Math.max(best, ...corners.map((c) => elevation(eye, c)));
  }
  return best;
}

describe('generateCity', () => {
  it('is deterministic for a seed and changes with the seed', () => {
    expect(generateCity(7)).toEqual(generateCity(7));
    expect(generateCity(7)).not.toEqual(generateCity(8));
  });

  it('keeps a modest number of buildings', () => {
    for (const seed of [1, 7, 42, 1234]) {
      const count = generateCity(seed).length;
      expect(count).toBeGreaterThanOrEqual(40);
      expect(count).toBeLessThanOrEqual(90);
    }
  });

  it('places every building fully outside the room, between z = -6 and z = -26', () => {
    for (const seed of [1, 7, 42, 1234]) {
      for (const b of generateCity(seed)) {
        const [, , z] = b.position;
        const depth = b.size[2];
        expect(z + depth / 2).toBeLessThan(-3.2);
        expect(z + depth / 2).toBeLessThanOrEqual(-6);
        expect(z - depth / 2).toBeGreaterThanOrEqual(-26);
      }
    }
  });

  it('gives every building a positive size, a sane height and a base on the ground', () => {
    for (const b of generateCity(7)) {
      for (const s of b.size) expect(s).toBeGreaterThan(0);
      expect(b.size[1]).toBeGreaterThanOrEqual(2);
      expect(b.size[1]).toBeLessThanOrEqual(30);
      expect(b.position[1] - b.size[1] / 2).toBeCloseTo(GROUND_Y);
      expect(b.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('lays the buildings out in two or three depth rows', () => {
    const zs = generateCity(7)
      .map((b) => b.position[2])
      .sort((a, b) => b - a);
    let rows = 1;
    for (let i = 1; i < zs.length; i++) if (zs[i - 1]! - zs[i]! > 1.8) rows++;
    expect(rows).toBeGreaterThanOrEqual(2);
    expect(rows).toBeLessThanOrEqual(3);
  });
});

describe('generateRidge', () => {
  const furthest = Math.min(...generateCity(7).map((b) => b.position[2] - b.size[2] / 2));

  it('is deterministic for a seed and changes with the seed', () => {
    expect(generateRidge(7)).toEqual(generateRidge(7));
    expect(generateRidge(7)).not.toEqual(generateRidge(8));
  });

  it('has two ranges with distinct colours, each a jagged silhouette from left to right', () => {
    const ranges = generateRidge(7);
    expect(ranges).toHaveLength(2);
    expect(ranges[0]!.color).not.toBe(ranges[1]!.color);
    for (const r of ranges) {
      expect(r.points.length).toBeGreaterThan(10);
      for (let i = 1; i < r.points.length; i++) expect(r.points[i]![0]).toBeGreaterThan(r.points[i - 1]![0]);
      const heights = r.points.map(([, y]) => y);
      expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(1);
    }
  });

  it('lies behind the city, between z = -45 and z = -70', () => {
    for (const r of generateRidge(7)) {
      expect(r.z).toBeLessThanOrEqual(-45);
      expect(r.z).toBeGreaterThanOrEqual(-70);
      expect(r.z + RIDGE_DEPTH).toBeLessThan(furthest);
    }
  });

  it('builds a triangle strip from the ridge down below the ground, behind the city', () => {
    for (const r of generateRidge(7)) {
      const positions = ridgeTriangles(r);
      expect(positions.length % 9).toBe(0);
      expect(positions.length).toBeGreaterThan(0);
      const ys: number[] = [];
      for (let i = 0; i < positions.length; i += 3) {
        ys.push(positions[i + 1]!);
        expect(positions[i + 2]!).toBeLessThan(furthest);
        expect(positions[i + 2]!).toBeGreaterThanOrEqual(r.z);
      }
      expect(Math.min(...ys)).toBeLessThan(GROUND_Y);
    }
  });
});

describe('the view through the window from the overview camera', () => {
  describe.each([1, 7, 42, 1234])('seed %i', (seed) => {
    const city = generateCity(seed);
    const ridges = generateRidge(seed);
    const sights = sightLines().map((s) => ({ ...s, ridge: ridgeElevation(ridges, s.az), roof: roofElevation(city, s.az) }));

    it('sees the ridge above the rooftops along every sight line', () => {
      for (const s of sights) {
        expect(s.ridge).toBeGreaterThan(-Infinity);
        expect(s.ridge).toBeGreaterThan(s.roof);
      }
    });

    it('shows, bottom to top, rooftops, the ridge line and sky', () => {
      expect(sights.some((s) => s.el < s.roof)).toBe(true);
      expect(sights.some((s) => s.el > s.roof && s.el < s.ridge)).toBe(true);
      expect(sights.some((s) => s.el > s.ridge)).toBe(true);
    });

    it('keeps the ridge line inside the opening across most of its width', () => {
      const columns = new Map<number, typeof sights>();
      sights.forEach((s, k) => {
        const i = Math.floor(k / 9);
        columns.set(i, [...(columns.get(i) ?? []), s]);
      });
      const crossed = [...columns.values()].filter(
        (col) => col.some((s) => s.el > s.ridge) && col.some((s) => s.el < s.ridge),
      );
      expect(crossed.length / columns.size).toBeGreaterThan(0.7);
    });
  });
});

describe('the view through the window from the window close-up', () => {
  const eye = hotspotById('window').view.position;

  describe.each([1, 7, 42, 1234])('seed %i', (seed) => {
    const city = generateCity(seed);
    const ridges = generateRidge(seed);
    // From 0.85 m the opening spans ~70° of elevation, so a 9×9 grid (~9° steps) steps over
    // the ridge band (a few degrees tall); 25×25 samples it at ~3°.
    const sights = sightLines(eye, 25).map((s) => ({
      ...s,
      ridge: ridgeElevation(ridges, s.az, eye),
      roof: roofElevation(city, s.az, eye),
    }));

    it('sees the ridge above the rooftops along every sight line', () => {
      for (const s of sights) {
        expect(s.ridge).toBeGreaterThan(-Infinity);
        expect(s.ridge).toBeGreaterThan(s.roof);
      }
    });

    it('shows rooftops, the ridge line and sky', () => {
      expect(sights.some((s) => s.el < s.roof)).toBe(true);
      expect(sights.some((s) => s.el > s.roof && s.el < s.ridge)).toBe(true);
      expect(sights.some((s) => s.el > s.ridge)).toBe(true);
    });
  });
});
