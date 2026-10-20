import { Box3 } from 'three';
import { describe, expect, it } from 'vitest';
import { DESK, DESK_ITEMS, DESK_TOP, hotspotById } from '../src/room/hotspots';
import { PI, PI_PARTS, PI_PLACEMENT, cableGeometry, cablePath, partGeometry, piToWorld, triangleCount } from '../src/room/piModel';

/** The monitor (and its stand) spans x within ±0.31 m: the cable keeps right of it. */
const MONITOR_CLEARANCE = 0.32;
const caseParts = PI_PARTS.filter((p) => p.group === 'case');

function boundsOf(parts: typeof PI_PARTS): Box3 {
  const box = new Box3();
  for (const part of parts) {
    const g = partGeometry(part);
    g.computeBoundingBox();
    box.union(g.boundingBox!);
  }
  return box;
}

describe('Raspberry Pi model', () => {
  it('is the size of a Pi 5 in an Argon NEO 5 M.2 case (95 x 72 x 41 mm, within 2 mm)', () => {
    const b = boundsOf(caseParts);
    expect(Math.abs(b.max.x - b.min.x - 0.072)).toBeLessThanOrEqual(0.002);
    expect(Math.abs(b.max.y - b.min.y - 0.041)).toBeLessThanOrEqual(0.002);
    expect(Math.abs(b.max.z - b.min.z - 0.095)).toBeLessThanOrEqual(0.002);
    expect([PI.width, PI.height, PI.length]).toEqual([0.072, 0.041, 0.095]);
  });

  it('stands on the desk top', () => {
    expect(boundsOf(caseParts).min.y).toBeCloseTo(0, 6);
    expect(PI_PLACEMENT.position[1]).toBe(DESK_TOP);
  });

  it('stays inside its desk-item footprint at its rotation', () => {
    const [cx, cz] = DESK_ITEMS.pi.at;
    const b = boundsOf(caseParts);
    for (const x of [b.min.x, b.max.x])
      for (const z of [b.min.z, b.max.z]) {
        const [wx, , wz] = piToWorld([x, 0, z]);
        expect(Math.hypot(wx - cx, wz - cz)).toBeLessThanOrEqual(DESK_ITEMS.pi.radius);
      }
  });

  it('keeps everything but the cables within a few mm of the case', () => {
    const b = boundsOf(PI_PARTS.filter((p) => p.group !== 'cable'));
    const c = boundsOf(caseParts);
    expect(c.min.x - b.min.x).toBeLessThan(0.02); // the USB-C plug sticks out of the left side
    expect(b.max.x - c.max.x).toBeLessThan(0.002);
    expect(b.max.y).toBeLessThanOrEqual(c.max.y + 0.001);
  });

  it('turns the port end (+z) towards the Pi close-up cameras, within 45°', () => {
    const { view, portraitView } = hotspotById('pi');
    const front = [Math.sin(PI_PLACEMENT.rotationY), Math.cos(PI_PLACEMENT.rotationY)];
    for (const v of [view, portraitView!]) {
      const dx = v.position[0] - v.target[0];
      const dz = v.position[2] - v.target[2];
      const cos = (front[0]! * dx + front[1]! * dz) / Math.hypot(dx, dz);
      expect(cos).toBeGreaterThan(Math.cos(Math.PI / 4));
    }
  });

  it('puts the ports on the front face, left to right: RJ45, USB 3, USB 2', () => {
    const ports = ['rj45', 'usb3', 'usb2'].map((name) => PI_PARTS.find((p) => p.name === name)!);
    for (const p of ports) expect(p.position[2]).toBeGreaterThan(PI.length / 2 - 0.004);
    // Facing the ports (looking towards -z), left is -x.
    expect(ports[0]!.position[0]).toBeLessThan(ports[1]!.position[0]);
    expect(ports[1]!.position[0]).toBeLessThan(ports[2]!.position[0]);
  });

  it('frames the box closely in the close-ups', () => {
    for (const v of [hotspotById('pi').view, hotspotById('pi').portraitView!]) {
      const d = Math.hypot(...v.position.map((p, k) => p - v.target[k]!));
      expect(d).toBeGreaterThan(0.25);
      expect(d).toBeLessThan(0.5);
    }
  });

  it('runs the Ethernet cable along the desk and off its back edge, clear of the mug and the case', () => {
    const points = cablePath();
    const [mx, mz] = DESK_ITEMS.mug.at;
    const [px, pz] = DESK_ITEMS.pi.at;
    const back = DESK.center[1] - DESK.size[1] / 2;
    for (const [i, [x, y, z]] of points.entries()) {
      if (z > back) expect(y, `point ${i}`).toBeGreaterThanOrEqual(DESK_TOP + PI.cableRadius - 0.0005);
      expect(Math.hypot(x - mx, z - mz), `point ${i}`).toBeGreaterThan(DESK_ITEMS.mug.radius + PI.cableRadius);
      if (i > 2) expect(Math.hypot(x - px, z - pz), `point ${i}`).toBeGreaterThan(DESK_ITEMS.pi.radius);
      expect(Math.abs(x)).toBeGreaterThan(MONITOR_CLEARANCE);
    }
    const end = points.at(-1)!;
    expect(end[2]).toBeLessThan(back);
    expect(end[1]).toBeLessThan(DESK_TOP);
  });

  it('stays within a modest triangle budget (< 3k)', () => {
    const total = PI_PARTS.reduce((sum, p) => sum + triangleCount(partGeometry(p)), 0) + triangleCount(cableGeometry());
    expect(total).toBeLessThan(3000);
  });
});
