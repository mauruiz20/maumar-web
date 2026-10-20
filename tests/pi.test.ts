import { Box3 } from 'three';
import { describe, expect, it } from 'vitest';
import { DESK_ITEMS, DESK_TOP, hotspotById } from '../src/room/hotspots';
import { PALETTE } from '../src/room/palette';
import * as piModel from '../src/room/piModel';
import { LED, PI, PI_LED, PI_PARTS, PI_PLACEMENT, ledIntensity, partGeometry, piToWorld, triangleCount } from '../src/room/piModel';

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

  it('has no cables in the room: both ports are empty openings', () => {
    expect(PI_PARTS.some((p) => /yellow/i.test(p.color) || /plug|cable/.test(p.name))).toBe(false);
    expect('cableYellow' in PALETTE).toBe(false);
    for (const gone of ['powerCablePath', 'powerCableGeometry', 'WALL_PARTS', 'OUTLET', 'BRICK', 'usbcPlugEnd']) {
      expect(gone in piModel, gone).toBe(false);
    }
    expect(PI_PARTS.find((p) => p.name === 'rj45-hole')?.color).toBe('ink');
    const usbc = PI_PARTS.find((p) => p.name === 'usbc-hole')!;
    expect(usbc.color).toBe('ink');
    // A small opening on the left side wall.
    expect(Math.abs(usbc.position[0] + PI.width / 2)).toBeLessThan(0.001);
  });

  it('has a tiny status LED on the port-end face, facing the Pi close-up', () => {
    const g = partGeometry(PI_LED);
    g.computeBoundingBox();
    const b = g.boundingBox!;
    // 2–3 mm across.
    for (const size of [b.max.x - b.min.x, b.max.y - b.min.y]) {
      expect(size).toBeGreaterThanOrEqual(0.002);
      expect(size).toBeLessThanOrEqual(0.003);
    }
    // On the front face (z = length / 2), within 1 mm, and inside the face's outline.
    expect(Math.abs(b.min.z - PI.length / 2)).toBeLessThanOrEqual(0.001);
    expect(b.max.z - PI.length / 2).toBeLessThanOrEqual(0.001);
    expect(Math.abs(PI_LED.position[0])).toBeLessThan(PI.width / 2 - PI.shellRadius);
    expect(PI_LED.position[1]).toBeGreaterThan(PI.feet + PI.base);
    expect(PI_LED.position[1]).toBeLessThan(PI.height);
    // Its face points at the close-up camera within 60°.
    const v = hotspotById('pi').view;
    const led = piToWorld(PI_LED.position);
    const normal = [Math.sin(PI_PLACEMENT.rotationY), 0, Math.cos(PI_PLACEMENT.rotationY)];
    const to = v.position.map((p, k) => p - led[k]!);
    const cos = (normal[0]! * to[0]! + normal[2]! * to[2]!) / Math.hypot(...to);
    expect(cos).toBeGreaterThan(Math.cos(Math.PI / 3));
  });

  it('breathes the LED softly between its limits, and holds it steady under reduced motion', () => {
    const samples = Array.from({ length: 400 }, (_, i) => ledIntensity(i * 0.025, false));
    for (const v of samples) {
      expect(v).toBeGreaterThanOrEqual(LED.min);
      expect(v).toBeLessThanOrEqual(LED.max);
    }
    expect(Math.max(...samples) - Math.min(...samples)).toBeGreaterThan((LED.max - LED.min) / 2);
    const steady = [0, 0.3, 1.7, 4.31, 99].map((t) => ledIntensity(t, true));
    expect(new Set(steady).size).toBe(1);
    expect(steady[0]).toBeGreaterThanOrEqual(LED.min);
    expect(steady[0]).toBeLessThanOrEqual(LED.max);
    // Calm: no big jumps between frames at 60 fps, outside the brief blink.
    const frames = Array.from({ length: 240 }, (_, i) => ledIntensity(0.5 + i / 60, false));
    const jumps = frames.slice(1).filter((v, i) => Math.abs(v - frames[i]!) > (LED.max - LED.min) * 0.2).length;
    expect(jumps).toBeLessThanOrEqual(4);
  });

  it('stays within a modest triangle budget (< 3k)', () => {
    const total = PI_PARTS.reduce((sum, p) => sum + triangleCount(partGeometry(p)), 0) + triangleCount(partGeometry(PI_LED));
    expect(total).toBeLessThan(3000);
  });
});
