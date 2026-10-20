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
  cableRadius: 0.0025,
} as const;

type Part =
  | { kind: 'box'; size: Vec3 }
  | { kind: 'rounded'; size: Vec3; radius: number; bevel: number }
  | { kind: 'cyl'; radius: number; height: number; segments: number; rotation?: Vec3 };

export type PiPart = Part & {
  name: string;
  /** 'case' is the box itself (shell, base, feet); 'cable' the plugs' cables. */
  group: 'case' | 'detail' | 'cable';
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
const PLUG = { width: 0.0118, height: 0.0095, length: 0.016 };

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
  // Port end, left to right facing it: Ethernet (with the yellow plug in), USB 3, USB 2.
  box('rj45', 'detail', [0.016, 0.0135, 0.0012], [RJ45_X, PORT_Y, FRONT + 0.0006], 'aluminium'),
  box('rj45-plug', 'detail', [PLUG.width, PLUG.height, PLUG.length], [RJ45_X, PORT_Y - 0.0005, FRONT + PLUG.length / 2], 'cableYellow'),
  ...usb('usb3', -0.0035, 'usbBlue'),
  ...usb('usb2', 0.0155, 'paper'),
  // Long vent slot on the right side, just above the seam.
  box('vent', 'detail', [0.0004, 0.0022, 0.06], [W / 2 + 0.0002, SHELL_BOTTOM + 0.003, -0.004], 'ink'),
  // USB-C power on the left side, near the far end: black plug and a short stub of cable.
  box('usbc-plug', 'detail', [0.011, 0.0065, 0.0125], [-W / 2 - 0.0055, SHELL_BOTTOM + 0.006, -0.026], 'ink'),
  {
    kind: 'cyl',
    name: 'usbc-cable',
    group: 'cable',
    radius: 0.0022,
    height: 0.03,
    segments: 6,
    rotation: [0, 0, Math.PI / 2],
    position: [-W / 2 - 0.011 - 0.015, SHELL_BOTTOM + 0.006, -0.026],
    color: 'ink',
  },
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
 * The yellow Ethernet cable, in world coordinates: out of the plug towards the room, round
 * the left side of the case, along the desk to its back edge and down behind it.
 */
export function cablePath(): Vec3[] {
  const r = PI.cableRadius;
  const plugEnd = piToWorld([RJ45_X, PORT_Y - 0.0005, FRONT + PLUG.length]);
  const onDeskAt = (x: number, z: number): Vec3 => {
    const [wx, , wz] = piToWorld([x, 0, z]);
    return [wx, DESK_TOP + r, wz];
  };
  const back = DESK.center[1] - DESK.size[1] / 2;
  const [sx, , sz] = onDeskAt(-0.07, -0.1);
  return [
    plugEnd,
    piToWorld([RJ45_X - 0.002, PORT_Y - 0.008, FRONT + PLUG.length + 0.012]),
    onDeskAt(-0.035, FRONT + PLUG.length + 0.022),
    onDeskAt(-0.06, FRONT + PLUG.length + 0.012),
    onDeskAt(-0.072, FRONT - 0.01),
    onDeskAt(-0.075, -0.03),
    [sx, DESK_TOP + r, sz],
    [sx - 0.01, DESK_TOP + r, back + 0.02],
    [sx - 0.012, DESK_TOP - 0.01, back - 0.012],
    [sx - 0.014, DESK_TOP - 0.16, back - 0.02],
  ];
}

export function cableGeometry(): TubeGeometry {
  const curve = new CatmullRomCurve3(cablePath().map((p) => new Vector3(...p)), false, 'centripetal');
  return new TubeGeometry(curve, 40, PI.cableRadius, 5, false);
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
