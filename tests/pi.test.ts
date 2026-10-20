import { Box3 } from 'three';
import { describe, expect, it } from 'vitest';
import { DESK, DESK_ITEMS, DESK_TOP, hotspotById } from '../src/room/hotspots';
import { PALETTE } from '../src/room/palette';
import { PLACEMENTS, LAMP_BULB } from '../src/room/layout';
import {
  BRICK,
  OUTLET,
  PI,
  PI_PARTS,
  PI_PLACEMENT,
  WALL_PARTS,
  WALL_Z,
  partGeometry,
  piToWorld,
  powerCableCurve,
  powerCableGeometry,
  powerCablePath,
  triangleCount,
  usbcPlugEnd,
} from '../src/room/piModel';

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

  it('keeps every part within a few mm of the case', () => {
    const b = boundsOf(PI_PARTS);
    const c = boundsOf(caseParts);
    expect(c.min.x - b.min.x).toBeLessThan(0.013); // the USB-C plug sticks out of the left side
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

  it('has no Ethernet cable or plug: the RJ45 port is empty', () => {
    expect(PI_PARTS.some((p) => /yellow/i.test(p.color) || p.name === 'rj45-plug')).toBe(false);
    expect('cableYellow' in PALETTE).toBe(false);
    expect(PI_PARTS.find((p) => p.name === 'rj45-hole')?.color).toBe('ink');
  });

  it('runs the black USB-C power cable along the desk, off its back edge, down to the brick', () => {
    const points = powerCableCurve().getPoints(200).map((v) => [v.x, v.y, v.z] as const);
    const [mx, mz] = DESK_ITEMS.mug.at;
    const [px, pz] = DESK_ITEMS.pi.at;
    const back = DESK.center[1] - DESK.size[1] / 2;
    const lamp = PLACEMENTS.lampRoundTable.position;
    // It starts at the USB-C plug and ends in the bottom of the power brick.
    expect(Math.hypot(...points[0]!.map((v, k) => v - usbcPlugEnd()[k]!))).toBeLessThan(1e-6);
    const end = points.at(-1)!;
    expect(Math.abs(end[0] - OUTLET.x)).toBeLessThan(0.01);
    expect(Math.abs(end[1] - (OUTLET.y - BRICK.size[1] / 2))).toBeLessThan(0.003);
    for (const [i, [x, y, z]] of points.entries()) {
      if (z > back + 0.005) expect(y, `sample ${i}`).toBeGreaterThanOrEqual(DESK_TOP + PI.powerCableRadius - 0.003);
      expect(Math.hypot(x - mx, z - mz), `sample ${i}`).toBeGreaterThan(DESK_ITEMS.mug.radius + PI.powerCableRadius);
      expect(Math.abs(x), `sample ${i}`).toBeGreaterThan(MONITOR_CLEARANCE);
      expect(Math.hypot(x - lamp[0], z - lamp[2]), `sample ${i}`).toBeGreaterThan(0.2);
      expect(Math.hypot(x - LAMP_BULB[0], z - LAMP_BULB[2])).toBeGreaterThan(0.2);
      // Clear of the case: past the plug, outside the case footprint.
      if (i > 20) expect(Math.hypot(x - px, z - pz), `sample ${i}`).toBeGreaterThan(DESK_ITEMS.pi.radius);
      // Never inside the wall.
      expect(z, `sample ${i}`).toBeGreaterThan(WALL_Z + PI.powerCableRadius);
    }
    expect(powerCablePath().length).toBeGreaterThan(6);
  });

  it('plugs the brick into a socket on the back wall, low and under the desk', () => {
    const socket = WALL_PARTS.find((p) => p.name === 'socket')!;
    const brick = WALL_PARTS.find((p) => p.name === 'brick')!;
    const sb = boundsOf([socket]);
    const bb = boundsOf([brick]);
    expect(sb.min.z).toBeCloseTo(WALL_Z, 6);
    expect(bb.min.z).toBeCloseTo(sb.max.z, 6);
    for (const b of [sb, bb]) {
      expect(b.max.y).toBeLessThan(DESK_TOP - 0.2);
      expect(b.min.y).toBeGreaterThan(0.05);
      expect(b.min.x).toBeGreaterThan(DESK.center[0] - DESK.size[0] / 2 + 0.1);
      expect(b.max.x).toBeLessThan(DESK.center[0] + DESK.size[0] / 2 - 0.1);
    }
    // The brick is centred on its socket.
    expect(Math.abs((bb.min.x + bb.max.x) / 2 - OUTLET.x)).toBeLessThan(1e-6);
    expect(Math.abs((bb.min.y + bb.max.y) / 2 - OUTLET.y)).toBeLessThan(1e-6);
  });

  it('keeps the socket and brick small', () => {
    expect(WALL_PARTS.reduce((sum, p) => sum + triangleCount(partGeometry(p)), 0)).toBeLessThan(400);
  });

  it('stays within a modest triangle budget (< 3k)', () => {
    const total = PI_PARTS.reduce((sum, p) => sum + triangleCount(partGeometry(p)), 0) + triangleCount(powerCableGeometry());
    expect(total).toBeLessThan(3000);
  });
});
