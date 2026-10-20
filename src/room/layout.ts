import type { ModelId } from './models';

/**
 * Where each Kenney model goes, and the model geometry that layout depends on. The bounds,
 * shelf heights, screen face and bulb were read once from the GLB files (Kenney units, the
 * model's own axes: +z is its front, y up); tests/models.test.ts re-reads the GLBs and fails
 * if a file changes. Everything else in the room is placed in metres, as in hotspots.ts.
 *
 * Imports nothing from hotspots.ts (which re-exports DESK and DESK_TOP from here), so the
 * two modules never form an import cycle.
 */
export type Vec3 = readonly [number, number, number];

export interface Bounds {
  min: Vec3;
  max: Vec3;
}

export interface Placement {
  position: Vec3;
  /** Radians about y: a whole number of quarter turns. */
  rotationY: number;
  scale: Vec3;
}

export const DESK_TOP = 0.75;
/** Desktop footprint on the floor plane: centre [x, z] and size [width, depth]. */
export const DESK = { center: [0, -2.5], size: [1.6, 0.8] } as const;

export const MODEL_BOUNDS: Record<ModelId, Bounds> = {
  desk: { min: [-0.01, 0, -0.38], max: [0.724, 0.384, 0.012] },
  chairDesk: { min: [0, 0, -0.314], max: [0.335, 0.608, 0] },
  computerScreen: { min: [0, 0, -0.104], max: [0.393, 0.294, 0] },
  computerKeyboard: { min: [0, 0, -0.118], max: [0.282, 0.028, 0] },
  computerMouse: { min: [-0.025, 0, -0.085], max: [0.025, 0.024, 0] },
  bookcaseOpen: { min: [0, 0, -0.25], max: [0.4, 0.88, 0] },
  books: { min: [0, 0, -0.094], max: [0.15, 0.104, 0] },
  lampRoundTable: { min: [-0.016, 0, -0.148], max: [0.136, 0.314, 0.028] },
  pottedPlant: { min: [-0.106, 0, -0.121], max: [0.106, 0.654, 0.121] },
  rugRectangle: { min: [0, 0, -0.92], max: [1.57, 0.01, 0] },
};

/** Top surfaces of the open bookcase's shelves (the last one is its top). */
export const BOOKCASE_SHELVES = [0.13, 0.37, 0.61, 0.85] as const;
/** The monitor's screen (its "metal" material): leans back ~8°, facing +z. */
export const SCREEN_FACE = { bottomLeft: [0.007, 0.056, -0.036], topRight: [0.386, 0.287, -0.068] } as const;
/** Inside the round lamp's shade, at the top of its stem. */
const BULB: Vec3 = [0.06, 0.19, -0.06];

function rotate([x, y, z]: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [x * c + z * s, y, -x * s + z * c];
}

/** A model-space point in the world, the way three applies position, rotation and scale. */
export function applyPlacement(p: Vec3, { position, rotationY, scale }: Placement): Vec3 {
  const [x, y, z] = rotate([p[0] * scale[0], p[1] * scale[1], p[2] * scale[2]], rotationY);
  return [x + position[0], y + position[1], z + position[2]];
}

function corners({ min, max }: Bounds): Vec3[] {
  const out: Vec3[] = [];
  for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) out.push([x, y, z]);
  return out;
}

function boundsOf(points: Vec3[]): Bounds {
  const min = [0, 1, 2].map((k) => Math.min(...points.map((p) => p[k]!))) as unknown as Vec3;
  const max = [0, 1, 2].map((k) => Math.max(...points.map((p) => p[k]!))) as unknown as Vec3;
  return { min, max };
}

export function placedBounds(b: Bounds, placement: Placement): Bounds {
  return boundsOf(corners(b).map((p) => applyPlacement(p, placement)));
}

interface PlaceOptions {
  /** World point under the footprint's centre, at the model's bottom. */
  at: Vec3;
  /** Quarter turns about y; 1 turns the model's front (+z) towards +x. */
  turns?: number;
  /** Uniform or per-axis scale (model axes)... */
  scale?: number | Vec3;
  /** ...or the world size [x, y, z] to stretch the model to. */
  size?: Vec3;
}

export function placeModel(b: Bounds, { at, turns = 0, scale, size }: PlaceOptions): Placement {
  const rotationY = (turns * Math.PI) / 2;
  const extent = [0, 1, 2].map((k) => b.max[k]! - b.min[k]!);
  const swap = turns % 2 !== 0;
  const s: Vec3 = size
    ? [(swap ? size[2] : size[0]) / extent[0]!, size[1] / extent[1]!, (swap ? size[0] : size[2]) / extent[2]!]
    : typeof scale === 'number'
      ? [scale, scale, scale]
      : (scale ?? [1, 1, 1]);
  const placed = placedBounds(b, { position: [0, 0, 0], rotationY, scale: s });
  return {
    position: [
      at[0] - (placed.min[0] + placed.max[0]) / 2,
      at[1] - placed.min[1],
      at[2] - (placed.min[2] + placed.max[2]) / 2,
    ],
    rotationY,
    scale: s,
  };
}

const BOOKCASE_SCALE = 1.8;
const BOOKCASE_DEPTH = (MODEL_BOUNDS.bookcaseOpen.max[2] - MODEL_BOUNDS.bookcaseOpen.min[2]) * BOOKCASE_SCALE;
const KIT_SMALL = 1.6;

export const PLACEMENTS = {
  desk: placeModel(MODEL_BOUNDS.desk, { at: [DESK.center[0], 0, DESK.center[1]], size: [DESK.size[0], DESK_TOP, DESK.size[1]] }),
  // An office chair tucked in, facing the desk (backrest towards the room). Kenney's backrest
  // is tall for its seat, so 1.04 m overall gives a ~0.40 m seat: the compromise between a
  // 0.45 m seat and a 0.95-1.0 m backrest.
  chairDesk: placeModel(MODEL_BOUNDS.chairDesk, { at: [0, 0, -1.8], turns: 2, size: [0.6, 1.04, 0.56] }),
  computerScreen: placeModel(MODEL_BOUNDS.computerScreen, { at: [0, DESK_TOP, -2.62], scale: KIT_SMALL }),
  computerKeyboard: placeModel(MODEL_BOUNDS.computerKeyboard, { at: [0, DESK_TOP, -2.3], scale: KIT_SMALL }),
  computerMouse: placeModel(MODEL_BOUNDS.computerMouse, { at: [0.3, DESK_TOP, -2.38], scale: KIT_SMALL }),
  lampRoundTable: placeModel(MODEL_BOUNDS.lampRoundTable, { at: [-0.62, DESK_TOP, -2.6], scale: KIT_SMALL }),
  // Against the left wall, facing into the room.
  bookcaseOpen: placeModel(MODEL_BOUNDS.bookcaseOpen, { at: [-3 + BOOKCASE_DEPTH / 2, 0, -0.6], turns: 1, scale: BOOKCASE_SCALE }),
  pottedPlant: placeModel(MODEL_BOUNDS.pottedPlant, { at: [1.3, 0, -2.6], scale: 1.4 }),
  rugRectangle: placeModel(MODEL_BOUNDS.rugRectangle, { at: [0, 0, -1.4], size: [2.4, 0.01, 1.7] }),
} satisfies Partial<Record<ModelId, Placement>>;

/** World height of a bookcase shelf (index into BOOKCASE_SHELVES). */
export function shelfY(index: number): number {
  return PLACEMENTS.bookcaseOpen.position[1] + BOOKCASE_SHELVES[index]! * BOOKCASE_SCALE;
}

/** The shelf the three clickable project books stand on. */
export const PROJECT_SHELF_Y = shelfY(2);

/** Kenney "books" as filler on the other shelves (not clickable). */
export const BOOK_FILLERS: Placement[] = [
  placeModel(MODEL_BOUNDS.books, { at: [-2.8, shelfY(0), -0.45], turns: 1, scale: BOOKCASE_SCALE }),
  placeModel(MODEL_BOUNDS.books, { at: [-2.8, shelfY(1), -0.75], turns: 1, scale: BOOKCASE_SCALE }),
  placeModel(MODEL_BOUNDS.books, { at: [-2.8, shelfY(3), -0.5], turns: 1, scale: BOOKCASE_SCALE }),
];

/** Pose of the CV's drei <Html transform> (640 x 384 CSS px) on the monitor's screen face. */
export const CV_SCREEN = (() => {
  const p = PLACEMENTS.computerScreen;
  const bl = applyPlacement(SCREEN_FACE.bottomLeft, p);
  const tr = applyPlacement(SCREEN_FACE.topRight, p);
  const tilt = Math.atan2(bl[2] - tr[2], tr[1] - bl[1]);
  // 2 mm in front of the face, along its normal (up and towards the room).
  const lift = 0.002;
  const position: Vec3 = [
    (bl[0] + tr[0]) / 2,
    (bl[1] + tr[1]) / 2 + lift * Math.sin(tilt),
    (bl[2] + tr[2]) / 2 + lift * Math.cos(tilt),
  ];
  // drei: one CSS px is distanceFactor / 400 m, so 640 px span the face's width.
  return { position, rotation: [-tilt, 0, 0] as Vec3, distanceFactor: ((tr[0] - bl[0]) * 400) / 640 };
})();

export const LAMP_BULB: Vec3 = applyPlacement(BULB, PLACEMENTS.lampRoundTable);
