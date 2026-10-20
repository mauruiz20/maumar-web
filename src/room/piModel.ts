import {
  BoxGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Shape,
  type BufferGeometry,
} from 'three';
import { DESK_TOP, onDesk, type Vec3 } from './hotspots';
import type { PaletteKey } from './palette';

/**
 * The owner's home server as procedural low-poly geometry: a Raspberry Pi 5 in an Argon NEO 5
 * M.2 NVMe case, modelled from his photos (no logo, no text). Pure data plus geometry
 * builders, so tests can check sizes, placement and the triangle budget in Node.
 *
 * Local frame, in metres: x across the case (width), y up from the desk, z along it; +z is
 * the port end. Facing the ports (looking towards -z), left is -x.
 */
export const PI = {
  width: 0.072,
  length: 0.095,
  height: 0.041,
  /** The NVMe base under the aluminium shell (with a seam between them) and its feet. */
  feet: 0.002,
  base: 0.011,
  shellRadius: 0.006,
  shellBevel: 0.0015,
} as const;

type Part =
  | { kind: 'box'; size: Vec3 }
  | { kind: 'rounded'; size: Vec3; radius: number; bevel: number }
  | { kind: 'cyl'; radius: number; height: number; segments: number; rotation?: Vec3 };

export type PiPart = Part & {
  name: string;
  /** 'case' is the box itself (shell, base, feet); 'detail' everything on it. */
  group: 'case' | 'detail';
  /** Centre, in the local frame. */
  position: Vec3;
  color: PaletteKey;
};

const W = PI.width;
const L = PI.length;
const H = PI.height;
const SHELL_BOTTOM = PI.feet + PI.base;
const SHELL_H = H - SHELL_BOTTOM;
const FRONT = L / 2;
const PORT_Y = SHELL_BOTTOM + 0.0085;
/** The heatsink notch: open through the top and the top of the port end. */
const NOTCH = { width: 0.04, depth: 0.018, drop: 0.011 };
const FINS = 9;

function box(name: string, group: PiPart['group'], size: Vec3, position: Vec3, color: PaletteKey): PiPart {
  return { kind: 'box', name, group, size, position, color };
}

function fins(): PiPart[] {
  const pitch = NOTCH.width / FINS;
  return Array.from({ length: FINS }, (_, i) =>
    box(
      `fin-${i}`,
      'detail',
      [0.0016, NOTCH.drop, NOTCH.depth],
      [-NOTCH.width / 2 + pitch * (i + 0.5), H - NOTCH.drop / 2 + 0.0006, FRONT - NOTCH.depth / 2 + 0.0006],
      'piFin',
    ),
  );
}

function screws(): PiPart[] {
  const at: [number, number][] = [
    [-0.028, FRONT - 0.012],
    [0.028, FRONT - 0.012],
    [-0.028, -FRONT + 0.008],
    [0.028, -FRONT + 0.008],
  ];
  return at.map(([x, z], i) => ({
    kind: 'cyl' as const,
    name: `screw-${i}`,
    group: 'detail' as const,
    radius: 0.0017,
    height: 0.0006,
    segments: 8,
    position: [x, H + 0.0003, z] as Vec3,
    color: 'piScrew' as const,
  }));
}

/** A stacked USB port: metal frame, dark opening, two coloured tongues. */
function usb(name: string, x: number, tongue: PaletteKey): PiPart[] {
  const z = FRONT + 0.0006;
  return [
    box(name, 'detail', [0.0135, 0.0145, 0.0012], [x, PORT_Y, z], 'aluminium'),
    box(`${name}-hole-top`, 'detail', [0.0115, 0.0055, 0.0004], [x, PORT_Y + 0.0035, z + 0.0008], 'ink'),
    box(`${name}-hole-bottom`, 'detail', [0.0115, 0.0055, 0.0004], [x, PORT_Y - 0.0035, z + 0.0008], 'ink'),
    box(`${name}-tongue-top`, 'detail', [0.0095, 0.0018, 0.0006], [x, PORT_Y + 0.0028, z + 0.0012], tongue),
    box(`${name}-tongue-bottom`, 'detail', [0.0095, 0.0018, 0.0006], [x, PORT_Y - 0.0042, z + 0.0012], tongue),
  ];
}

const RJ45_X = -0.023;
/** The USB-C power port on the left side, near the far end. */
const USBC = { y: SHELL_BOTTOM + 0.006, z: -0.026 };

export const PI_PARTS: readonly PiPart[] = [
  // The case: feet, the darker NVMe base (inset, so the seam shows), the aluminium shell.
  ...[-1, 1].flatMap((sx) =>
    [-1, 1].map((sz) =>
      box(`foot-${sx}${sz}`, 'case', [0.012, PI.feet, 0.01], [sx * (W / 2 - 0.009), PI.feet / 2, sz * (L / 2 - 0.008)], 'piBase'),
    ),
  ),
  {
    kind: 'rounded',
    name: 'base',
    group: 'case',
    size: [W - 0.0016, PI.base, L - 0.0016],
    radius: PI.shellRadius - 0.0008,
    bevel: 0.0005,
    position: [0, PI.feet + PI.base / 2, 0],
    color: 'piBase',
  },
  {
    kind: 'rounded',
    name: 'shell',
    group: 'case',
    size: [W, SHELL_H, L],
    radius: PI.shellRadius,
    bevel: PI.shellBevel,
    position: [0, SHELL_BOTTOM + SHELL_H / 2, 0],
    color: 'piShell',
  },
  // The heatsink notch, as dark plates over the top and the port end, with the fins in it.
  box('notch-top', 'detail', [NOTCH.width, 0.0004, NOTCH.depth], [0, H + 0.0002, FRONT - NOTCH.depth / 2], 'ink'),
  box('notch-front', 'detail', [NOTCH.width, NOTCH.drop, 0.0004], [0, H - NOTCH.drop / 2, FRONT + 0.0002], 'ink'),
  ...fins(),
  ...screws(),
  // Port end, left to right facing it: Ethernet (empty), USB 3, USB 2.
  box('rj45', 'detail', [0.016, 0.0135, 0.0012], [RJ45_X, PORT_Y, FRONT + 0.0006], 'aluminium'),
  box('rj45-hole', 'detail', [0.0118, 0.0095, 0.0004], [RJ45_X, PORT_Y - 0.0005, FRONT + 0.0014], 'ink'),
  ...usb('usb3', -0.0035, 'usbBlue'),
  ...usb('usb2', 0.0155, 'paper'),
  // Long vent slot on the right side, just above the seam.
  box('vent', 'detail', [0.0004, 0.0022, 0.06], [W / 2 + 0.0002, SHELL_BOTTOM + 0.003, -0.004], 'ink'),
  // USB-C power port on the left side, near the far end: empty, like the RJ45 (no cables).
  box('usbc-hole', 'detail', [0.0004, 0.0032, 0.009], [-W / 2 - 0.0002, USBC.y, USBC.z], 'ink'),
];

/** On the desk at its DESK_ITEMS spot, turned so the ports face the Pi close-up camera. */
export const PI_PLACEMENT = { position: onDesk('pi', DESK_TOP), rotationY: 0.45 } as const;

export function piToWorld([x, y, z]: Vec3): Vec3 {
  const c = Math.cos(PI_PLACEMENT.rotationY);
  const s = Math.sin(PI_PLACEMENT.rotationY);
  const [px, py, pz] = PI_PLACEMENT.position;
  return [px + x * c + z * s, py + y, pz - x * s + z * c];
}

/**
 * The green status LED: a 2.5 mm dot on the port-end face, right of the USB 2 ports. Its own
 * mesh and material (RaspberryPi.tsx), so its glow can pulse without touching the case.
 */
export const PI_LED: PiPart = {
  kind: 'cyl',
  name: 'led',
  group: 'detail',
  radius: 0.00125,
  height: 0.0008,
  segments: 10,
  rotation: [Math.PI / 2, 0, 0],
  position: [0.029, PORT_Y + 0.004, FRONT + 0.0004],
  color: 'ledGreen',
};

/** Emissive intensity range of the LED. */
export const LED = { min: 0.35, max: 2.2, period: 1.6, blinkEvery: 4.3, blinkFor: 0.12 } as const;

/**
 * LED glow at time t (seconds): a slow, smooth breathe (LED.period), with a brief, calm
 * activity blink now and then. Steady (bright, no change) under prefers-reduced-motion.
 */
export function ledIntensity(t: number, reducedMotion: boolean): number {
  if (reducedMotion) return LED.min + (LED.max - LED.min) * 0.75;
  const breathe = 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / LED.period);
  const blink = t % LED.blinkEvery < LED.blinkFor ? 1 : 0;
  return LED.min + (LED.max - LED.min) * Math.max(breathe * 0.8, blink);
}

/** A box with rounded vertical edges and a small bevel on the top and bottom edges. */
function roundedBox([w, h, d]: Vec3, radius: number, bevel: number): BufferGeometry {
  const iw = w / 2 - bevel;
  const id = d / 2 - bevel;
  const r = Math.max(0.0001, radius - bevel);
  const shape = new Shape();
  shape.moveTo(-iw + r, -id);
  shape.lineTo(iw - r, -id);
  shape.quadraticCurveTo(iw, -id, iw, -id + r);
  shape.lineTo(iw, id - r);
  shape.quadraticCurveTo(iw, id, iw - r, id);
  shape.lineTo(-iw + r, id);
  shape.quadraticCurveTo(-iw, id, -iw, id - r);
  shape.lineTo(-iw, -id + r);
  shape.quadraticCurveTo(-iw, -id, -iw + r, -id);
  const g = new ExtrudeGeometry(shape, {
    depth: h - 2 * bevel,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 3,
  });
  // Extruded along +z from -bevel to depth + bevel: stand it up and centre it.
  g.rotateX(-Math.PI / 2);
  g.translate(0, bevel - h / 2, 0);
  return g;
}

/** Geometry of one part, already moved to its position in the local frame. */
export function partGeometry(part: PiPart): BufferGeometry {
  let g: BufferGeometry;
  if (part.kind === 'box') g = new BoxGeometry(...part.size);
  else if (part.kind === 'rounded') g = roundedBox(part.size, part.radius, part.bevel);
  else {
    g = new CylinderGeometry(part.radius, part.radius, part.height, part.segments);
    if (part.rotation) {
      g.rotateX(part.rotation[0]);
      g.rotateY(part.rotation[1]);
      g.rotateZ(part.rotation[2]);
    }
  }
  g.translate(...part.position);
  return g;
}

export function triangleCount(g: BufferGeometry): number {
  return (g.index ? g.index.count : g.getAttribute('position').count) / 3;
}
