import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { en } from '../src/content/en';
import { es } from '../src/content/es';
import { DESK, DESK_ITEMS, DESK_TOP, FOV, OVERVIEW_PORTRAIT, viewFor, type CameraView, type Vec3 } from '../src/room/hotspots';
import {
  DESK_GROUP,
  DESK_VIEW,
  markerPosition,
  navigate,
  placeOf,
  visibleMarkers,
  type MarkerId,
  type Place,
} from '../src/room/nav';

const PHONES = [
  [390, 844],
  [360, 740],
] as const;

/** Screen position in CSS px (0,0 top-left) of a point seen from a view, as the rig frames it. */
function toScreen(view: CameraView, [w, h]: readonly [number, number], point: Vec3) {
  const camera = new PerspectiveCamera(FOV.portrait, w / h, 0.05, 180);
  camera.position.set(...view.position);
  camera.lookAt(new Vector3(...view.target));
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  const p = new Vector3(...point).project(camera);
  return { x: ((p.x + 1) / 2) * w, y: ((1 - p.y) / 2) * h, z: p.z };
}

function minDistance(points: { x: number; y: number }[]): number {
  let min = Infinity;
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++)
      min = Math.min(min, Math.hypot(points[i]!.x - points[j]!.x, points[i]!.y - points[j]!.y));
  return min;
}

describe('visibleMarkers', () => {
  it('shows one desk marker plus the bookshelf, whiteboard and window in the touch overview', () => {
    expect(visibleMarkers({ compact: true, place: 'overview' }).sort()).toEqual(
      ['bookshelf', 'desk', 'whiteboard', 'window'].sort(),
    );
  });

  it('shows exactly the four desk markers in the desk view', () => {
    expect(visibleMarkers({ compact: true, place: 'desk' }).sort()).toEqual(['monitor', 'mug', 'phone', 'pi'].sort());
    expect([...DESK_GROUP].sort()).toEqual(['monitor', 'mug', 'phone', 'pi'].sort());
  });

  it('shows no markers inside a hotspot view, and none at all with a fine pointer', () => {
    for (const place of ['monitor', 'mug', 'window', 'bookshelf'] as Place[]) {
      expect(visibleMarkers({ compact: true, place })).toEqual([]);
    }
    for (const place of ['overview', 'desk', 'mug'] as Place[]) expect(visibleMarkers({ compact: false, place })).toEqual([]);
  });
});

describe('navigate (the Back stack)', () => {
  it('opens the desk view from the overview, and Back returns to the overview', () => {
    const desk = navigate([], { type: 'desk' });
    expect(placeOf(desk)).toBe('desk');
    expect(placeOf(navigate(desk, { type: 'back' }))).toBe('overview');
  });

  it('returns to the desk view from a desk hotspot opened there', () => {
    const mug = navigate(['desk'], { type: 'open', id: 'mug', source: 'scene' });
    expect(placeOf(mug)).toBe('mug');
    const back = navigate(mug, { type: 'back' });
    expect(placeOf(back)).toBe('desk');
    expect(placeOf(navigate(back, { type: 'back' }))).toBe('overview');
  });

  it('keeps the desk underneath when moving between desk hotspots in the scene', () => {
    const pi = navigate(['desk', 'mug'], { type: 'open', id: 'pi', source: 'scene' });
    expect(pi).toEqual(['desk', 'pi']);
  });

  it('opens a hotspot chosen from the menu directly: Back goes to the overview', () => {
    for (const from of [[], ['desk'], ['desk', 'mug'], ['bookshelf']] as Place[][]) {
      const s = navigate(from, { type: 'open', id: 'phone', source: 'menu' });
      expect(s).toEqual(['phone']);
      expect(placeOf(navigate(s, { type: 'back' }))).toBe('overview');
    }
  });

  it('opens a hotspot outside the desk group directly, even from the desk view', () => {
    expect(navigate(['desk'], { type: 'open', id: 'window', source: 'scene' })).toEqual(['window']);
  });

  it('does nothing on Back in the overview, and re-opening the current place is a no-op', () => {
    expect(navigate([], { type: 'back' })).toEqual([]);
    const s = ['desk', 'mug'] as Place[];
    expect(navigate(s, { type: 'open', id: 'mug', source: 'scene' })).toBe(s);
  });
});

describe('desk view framing on phones', () => {
  describe.each(PHONES)('%i × %i', (w, h) => {
    const view = viewFor(DESK_VIEW, w / h);

    it('shows the whole desktop', () => {
      const [cx, cz] = DESK.center;
      const [dw, dd] = DESK.size;
      for (const sx of [-1, 1])
        for (const sz of [-1, 1]) {
          const p = toScreen(view, [w, h], [cx + (sx * dw) / 2, DESK_TOP, cz + (sz * dd) / 2]);
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.x).toBeLessThanOrEqual(w);
          expect(p.y).toBeGreaterThanOrEqual(0);
          expect(p.y).toBeLessThanOrEqual(h);
        }
    });

    it('spreads the four desk markers at least 56 px apart, clear of the buttons and edges', () => {
      const points = DESK_GROUP.map((id) => toScreen(view, [w, h], markerPosition(id, 'desk')));
      expect(minDistance(points)).toBeGreaterThanOrEqual(56);
      for (const p of points) {
        expect(p.z).toBeLessThan(1);
        expect(p.x).toBeGreaterThan(30);
        expect(p.x).toBeLessThan(w - 30);
        // Back and Objects take the top ~7.5rem on the left; View CV the top right.
        expect(p.y).toBeGreaterThan(130);
        expect(p.y).toBeLessThan(h - 40);
      }
    });

    it('keeps each desk-view marker over its object', () => {
      for (const id of DESK_GROUP) {
        const [x, , z] = markerPosition(id, 'desk');
        if (id === 'monitor') expect(x).toBe(0);
        else expect([x, z]).toEqual([...DESK_ITEMS[id].at]);
      }
    });
  });
});

describe('touch overview markers', () => {
  it.each(PHONES)('are at least 56 px apart and inside the screen at %i × %i', (w, h) => {
    const ids = visibleMarkers({ compact: true, place: 'overview' });
    const points = ids.map((id: MarkerId) => toScreen(OVERVIEW_PORTRAIT, [w, h], markerPosition(id, 'overview')));
    expect(minDistance(points)).toBeGreaterThanOrEqual(56);
    for (const p of points) {
      expect(p.z).toBeLessThan(1);
      expect(p.x).toBeGreaterThan(24);
      expect(p.x).toBeLessThan(w - 24);
      expect(p.y).toBeGreaterThan(80);
      expect(p.y).toBeLessThan(h - 80);
    }
  });
});

describe('desk marker label', () => {
  it('is localized', () => {
    expect(en.room.desk).toBe('Desk');
    expect(es.room.desk).toBe('Escritorio');
  });
});
