import {
  BoxGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  ExtrudeGeometry,
  Shape,
  TubeGeometry,
  Vector3,
  type BufferGeometry,
} from 'three';
import { DESK, DESK_TOP, onDesk, type Vec3 } from './hotspots';
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
  /** A USB-C cable is about 4 mm thick. */
  powerCableRadius: 0.002,
} as const;

type Part =
  | { kind: 'box'; size: Vec3 }
  | { kind: 'rounded'; size: Vec3; radius: number; bevel: number }
  | { kind: 'cyl'; radius: number; height: number; segments: number; rotation?: Vec3 };

export type PiPart = Part & {
  name: string;
  /** 'case' is the box itself (shell, base, feet); 'wall' the socket and power brick. */
  group: 'case' | 'detail' | 'wall';
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
/** The USB-C plug on the left side, near the far end. */
const USBC = { y: SHELL_BOTTOM + 0.006, z: -0.026, size: [0.011, 0.0065, 0.0125] as Vec3 };

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
  // USB-C power plug on the left side, near the far end (its cable: powerCablePath).
  box('usbc-plug', 'detail', USBC.size, [-W / 2 - USBC.size[0] / 2, USBC.y, USBC.z], 'ink'),
];

/** On the desk at its DESK_ITEMS spot, turned so the ports face the Pi close-up camera. */
export const PI_PLACEMENT = { position: onDesk('pi', DESK_TOP), rotationY: 0.45 } as const;

export function piToWorld([x, y, z]: Vec3): Vec3 {
  const c = Math.cos(PI_PLACEMENT.rotationY);
  const s = Math.sin(PI_PLACEMENT.rotationY);
  const [px, py, pz] = PI_PLACEMENT.position;
  return [px + x * c + z * s, py + y, pz - x * s + z * c];
}

/** The back wall's plane (the room's inside face). */
export const WALL_Z = -3;
/** The wall socket's centre on the back wall: low, behind the desk, right of its middle. */
export const OUTLET = { x: 0.5, y: 0.3 } as const;
const SOCKET = { size: [0.07, 0.07, 0.008] as Vec3 };
/** The official 27 W USB-C power supply: a small rounded black brick, cable out of its bottom. */
export const BRICK = { size: [0.05, 0.062, 0.032] as Vec3 };

/** Socket plate and power brick, in world coordinates (not part of the clickable Pi). */
export const WALL_PARTS: readonly PiPart[] = [
  {
    kind: 'rounded',
    name: 'socket',
    group: 'wall',
    size: SOCKET.size,
    radius: 0.006,
    bevel: 0.0015,
    position: [OUTLET.x, OUTLET.y, WALL_Z + SOCKET.size[2] / 2],
    color: 'rule',
  },
  {
    kind: 'rounded',
    name: 'brick',
    group: 'wall',
    size: BRICK.size,
    radius: 0.008,
    bevel: 0.003,
    position: [OUTLET.x, OUTLET.y, WALL_Z + SOCKET.size[2] + BRICK.size[2] / 2],
    color: 'ink',
  },
];

/** Where the power cable leaves the USB-C plug, in world coordinates. */
export function usbcPlugEnd(): Vec3 {
  return piToWorld([-W / 2 - USBC.size[0], USBC.y, USBC.z]);
}

/**
 * The black USB-C power cable, in world coordinates: out of the plug, down onto the desk,
 * back along it past the monitor's right, off the back edge, down behind the desk and into
 * the bottom of the power brick on the wall socket.
 */
export function powerCablePath(): Vec3[] {
  const r = PI.powerCableRadius;
  const onDeskAt = (x: number, z: number): Vec3 => {
    const [wx, , wz] = piToWorld([x, 0, z]);
    return [wx, DESK_TOP + r, wz];
  };
  const back = DESK.center[1] - DESK.size[1] / 2;
  const brickBottom = OUTLET.y - BRICK.size[1] / 2;
  const brickZ = WALL_Z + SOCKET.size[2] + BRICK.size[2] / 2;
  const drop = OUTLET.x + 0.045;
  return [
    usbcPlugEnd(),
    piToWorld([-W / 2 - USBC.size[0] - 0.01, USBC.y - 0.008, USBC.z - 0.004]),
    onDeskAt(-W / 2 - 0.03, -0.045),
    onDeskAt(-W / 2 - 0.035, -0.09),
    [OUTLET.x + 0.03, DESK_TOP + r, -2.75],
    [drop, DESK_TOP + r, back + 0.012],
    [drop, DESK_TOP - 0.012, back - 0.014],
    [drop, DESK_TOP - 0.15, brickZ + 0.03],
    [drop, brickBottom + 0.06, brickZ + 0.025],
    [drop - 0.012, brickBottom - 0.03, brickZ + 0.01],
    [OUTLET.x + 0.012, brickBottom - 0.028, brickZ],
    [OUTLET.x, brickBottom, brickZ],
  ];
}

export function powerCableCurve(): CatmullRomCurve3 {
  return new CatmullRomCurve3(powerCablePath().map((p) => new Vector3(...p)), false, 'centripetal');
}

export function powerCableGeometry(): TubeGeometry {
  return new TubeGeometry(powerCableCurve(), 64, PI.powerCableRadius, 5, false);
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
