import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { FOV, HOTSPOTS, OVERVIEW_PORTRAIT, hasPanel, panelShift, viewFor, type CameraView, type Vec3 } from '../src/room/hotspots';
import { menuLayout } from '../src/room/menu';

const PHONES = [
  [390, 844],
  [360, 740],
] as const;

/** Screen position of a point as fractions of the viewport (0,0 top-left), like the camera rig frames it. */
function project(view: CameraView, [w, h]: readonly [number, number], point: Vec3, shift = { x: 0, y: 0 }) {
  const camera = new PerspectiveCamera(FOV.portrait, w / h, 0.05, 180);
  camera.position.set(...view.position);
  camera.lookAt(new Vector3(...view.target));
  if (shift.x || shift.y) camera.setViewOffset(w, h, shift.x * w, shift.y * h, w, h);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  const p = new Vector3(...point).project(camera);
  return { x: (p.x + 1) / 2, y: (1 - p.y) / 2, z: p.z };
}

describe('viewFor', () => {
  it('uses the portrait view on portrait canvases and the landscape view otherwise', () => {
    for (const h of HOTSPOTS) {
      expect(viewFor(h, 390 / 844)).toBe(h.portraitView);
      expect(viewFor(h, 1440 / 900)).toBe(h.view);
      expect(viewFor(h, 1)).toBe(h.view);
    }
  });

  it('falls back to the landscape view when a hotspot has no portrait view', () => {
    const [first] = HOTSPOTS;
    const { portraitView: _, ...bare } = first!;
    expect(viewFor(bare, 0.5)).toBe(first!.view);
  });

  it('gives every hotspot a portrait view', () => {
    for (const h of HOTSPOTS) expect(h.portraitView, h.id).toBeDefined();
  });
});

describe('portrait framing', () => {
  describe.each(PHONES)('%i × %i', (w, h) => {
    it('frames each object above the bottom sheet (upper ~45% of the screen)', () => {
      for (const hotspot of HOTSPOTS.filter((s) => hasPanel(s.content))) {
        const view = viewFor(hotspot, w / h);
        const shift = panelShift('sheet', true);
        const target = project(view, [w, h], view.target, shift);
        expect(target.y, hotspot.id).toBeLessThan(0.45);
        expect(target.y, hotspot.id).toBeGreaterThan(0.1);
        expect(target.x, hotspot.id).toBeGreaterThan(0.2);
        expect(target.x, hotspot.id).toBeLessThan(0.8);
      }
    });

    it('keeps the window view (no sheet) centred, with no shift', () => {
      for (const hotspot of HOTSPOTS.filter((s) => !hasPanel(s.content))) {
        const view = viewFor(hotspot, w / h);
        const target = project(view, [w, h], view.target);
        expect(target.y).toBeCloseTo(0.5);
        expect(target.x).toBeCloseTo(0.5);
      }
    });

    it('shows every marker inside the portrait overview, clear of the edges', () => {
      for (const hotspot of HOTSPOTS) {
        const p = project(OVERVIEW_PORTRAIT, [w, h], hotspot.marker);
        expect(p.z, hotspot.id).toBeLessThan(1);
        expect(p.x, hotspot.id).toBeGreaterThan(0.06);
        expect(p.x, hotspot.id).toBeLessThan(0.94);
        expect(p.y, hotspot.id).toBeGreaterThan(0.1);
        expect(p.y, hotspot.id).toBeLessThan(0.85);
      }
    });
  });
});

describe('panelShift', () => {
  it('moves the view centre away from the panel, further up for a portrait sheet', () => {
    expect(panelShift(null, false)).toEqual({ x: 0, y: 0 });
    expect(panelShift(null, true)).toEqual({ x: 0, y: 0 });
    expect(panelShift('side', false).x).toBeGreaterThan(0);
    expect(panelShift('sheet', false).y).toBeGreaterThan(0);
    expect(panelShift('sheet', true).y).toBeGreaterThan(panelShift('sheet', false).y);
  });
});

describe('menuLayout', () => {
  it('collapses to a button on touch or narrow screens, in the overview too', () => {
    expect(menuLayout({ compact: true, inView: false })).toBe('button');
    expect(menuLayout({ compact: true, inView: true })).toBe('button');
  });

  it('lists the objects on desktop in the overview and collapses inside a view', () => {
    expect(menuLayout({ compact: false, inView: false })).toBe('list');
    expect(menuLayout({ compact: false, inView: true })).toBe('button');
  });
});
