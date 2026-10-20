import type { Project } from '../content/profile';
import { CV_SCREEN, DESK, DESK_TOP, PROJECT_SHELF_Y } from './layout';

/**
 * Room layout in metres. Floor at y = 0; the back wall is the plane z = -3 and the left wall
 * the plane x = -3. The desk and the whiteboard are on the back wall, the bookshelf stands
 * against the left wall, and the overview camera looks in from the front-right corner.
 */
export type Vec3 = readonly [number, number, number];

export interface CameraView {
  position: Vec3;
  target: Vec3;
}

export type HotspotId = 'monitor' | 'bookshelf' | 'whiteboard' | 'pi' | 'phone' | 'mug' | 'window';
export type ProjectId = Project['id'];

/** What a hotspot shows. The text itself always comes from the en/es content objects. */
export type HotspotContent =
  | { kind: 'experience' }
  | { kind: 'projects'; projects: ProjectId[] }
  | { kind: 'skills' }
  | { kind: 'project'; project: ProjectId }
  | { kind: 'contact' }
  | { kind: 'education' }
  /** A visual pause: the camera moves, no panel or sheet opens. */
  | { kind: 'view' };

/** Every hotspot opens a content panel (or sheet) except a plain view. */
export function hasPanel(content: HotspotContent): boolean {
  return content.kind !== 'view';
}

export interface Hotspot {
  id: HotspotId;
  /** Scene objects that react to the click (the monitor view also seats you in the chair). */
  objects: string[];
  view: CameraView;
  /**
   * Used on portrait canvases (aspect < 1, 70° FOV): the object sits in the upper ~45% of the
   * screen, above the bottom sheet, once panelShift('sheet', true) moves the view centre up.
   */
  portraitView?: CameraView;
  content: HotspotContent;
  /** Where the tap marker floats on touch screens. */
  marker: Vec3;
}

// The desk's numbers live with the model layout (layout.ts) and are re-exported here.
export { DESK, DESK_TOP };
/** The back-wall window's opening: centre [x, y] and size [width, height], in the plane z = -3. */
export const WINDOW = { center: [0.9, 1.55], size: [1.4, 1.2] } as const;

/**
 * Small objects on the desk: floor-plane position [x, z] and a footprint radius that covers
 * the object at any rotation. The scene, the touch hit areas, the camera views and the
 * markers all read these, so an object and its hotspot never drift apart.
 */
export const DESK_ITEMS = {
  pi: { at: [0.58, -2.3], radius: 0.065 },
  phone: { at: [-0.42, -2.25], radius: 0.09 },
  mug: { at: [0.36, -2.22], radius: 0.065 },
} as const satisfies Record<string, { at: readonly [number, number]; radius: number }>;

/** A desk item's position at height y above the floor. */
export function onDesk(item: keyof typeof DESK_ITEMS, y: number): Vec3 {
  const [x, z] = DESK_ITEMS[item].at;
  return [x, y, z];
}

/** Vertical field of view in degrees, by canvas orientation. */
export const FOV = { landscape: 40, portrait: 70 } as const;

/** The camera view for a hotspot on a canvas of this aspect (width / height). */
export function viewFor(hotspot: Pick<Hotspot, 'view' | 'portraitView'>, aspect: number): CameraView {
  return aspect < 1 && hotspot.portraitView ? hotspot.portraitView : hotspot.view;
}

export type PanelKind = 'side' | 'sheet';

/**
 * Fraction of the canvas the view centre moves by while a panel covers part of it: the side
 * panel (right) is wider than the object menu (left); the bottom sheet covers the lower part,
 * and on a portrait phone it leaves only the upper ~45% free.
 */
export function panelShift(panel: PanelKind | null, portrait: boolean): { x: number; y: number } {
  if (panel === 'side') return { x: 0.07, y: 0 };
  if (panel === 'sheet') return { x: 0, y: portrait ? 0.28 : 0.18 };
  return { x: 0, y: 0 };
}

export const OVERVIEW: CameraView = { position: [3.1, 2.5, 3.3], target: [-0.6, 0.95, -0.9] };
/** Portrait screens (with a 70° FOV): further back, so every tap marker fits the width. */
export const OVERVIEW_PORTRAIT: CameraView = { position: [3.5, 4, 7.5], target: [-0.9, 1, -2] };

export const HOTSPOTS: readonly Hotspot[] = [
  {
    id: 'monitor',
    objects: ['monitor', 'chair'],
    // Seated, looking slightly down at the centre of the monitor model's screen.
    view: { position: [0, 1.13, -1.65], target: CV_SCREEN.position },
    // Higher and further back, over the chair back, so screen and desk fit the narrow width.
    portraitView: { position: [0, 1.32, -1.15], target: CV_SCREEN.position },
    content: { kind: 'experience' },
    marker: [0, 1.4, -2.62],
  },
  {
    id: 'bookshelf',
    objects: ['bookshelf'],
    view: { position: [-0.9, 1.3, -0.6], target: [-2.8, 1.15, -0.6] },
    portraitView: { position: [-1.0, 1.45, -0.72], target: [-2.8, 1.25, -0.72] },
    content: { kind: 'projects', projects: ['turnero', 'monogestor', 'jobradar'] },
    marker: [-2.7, 2.05, -0.6],
  },
  {
    id: 'whiteboard',
    objects: ['whiteboard'],
    view: { position: [-1.75, 1.5, -0.95], target: [-1.75, 1.5, -2.97] },
    // Far enough back for the 1.26 m board to fit the narrow portrait width.
    portraitView: { position: [-1.75, 1.6, -0.75], target: [-1.75, 1.5, -2.97] },
    content: { kind: 'skills' },
    marker: [-1.75, 2.05, -2.9],
  },
  {
    id: 'pi',
    objects: ['pi'],
    view: { position: [0.95, 1.22, -1.7], target: onDesk('pi', DESK_TOP + 0.02) },
    portraitView: { position: [0.85, 1.25, -1.72], target: onDesk('pi', DESK_TOP + 0.02) },
    content: { kind: 'project', project: 'home-server' },
    marker: onDesk('pi', DESK_TOP + 0.16),
  },
  {
    id: 'phone',
    objects: ['phone'],
    // From the left of the desk: the chair (x within ±0.24) would block a view from the front.
    view: { position: [-0.66, 1.22, -1.82], target: onDesk('phone', DESK_TOP) },
    portraitView: { position: [-0.7, 1.25, -1.78], target: onDesk('phone', DESK_TOP) },
    content: { kind: 'contact' },
    marker: onDesk('phone', DESK_TOP + 0.14),
  },
  {
    id: 'mug',
    objects: ['mug'],
    view: { position: [0.72, 1.18, -1.62], target: onDesk('mug', DESK_TOP + 0.05) },
    portraitView: { position: [0.66, 1.2, -1.64], target: onDesk('mug', DESK_TOP + 0.05) },
    content: { kind: 'education' },
    marker: onDesk('mug', DESK_TOP + 0.22),
  },
  {
    id: 'window',
    objects: ['window'],
    // Standing at the window, 0.85 m from the glass, looking out and ~2.4° down. The frame
    // falls just outside the view; the mullion and transom frame the city and the ridge.
    view: {
      position: [WINDOW.center[0], 1.6, -2.15],
      target: [WINDOW.center[0], 1.43, -6.15],
    },
    // Portrait is narrow (~36° across): stand in front of the right-hand pane, so the
    // mullion and the frame stay out of view.
    portraitView: {
      position: [WINDOW.center[0] + WINDOW.size[0] / 4, 1.6, -2.15],
      target: [WINDOW.center[0] + WINDOW.size[0] / 4, 1.43, -6.15],
    },
    content: { kind: 'view' },
    marker: [WINDOW.center[0], WINDOW.center[1] + WINDOW.size[1] / 2 + 0.16, -2.95],
  },
];

/** Not clickable as hotspots. The lamp only toggles its light (an easter egg). */
export const DECOR = ['lamp', 'plant', 'rug', 'frame'] as const;

export interface Book {
  project: ProjectId;
  position: Vec3;
  size: Vec3;
  color: string;
}

/** A project book standing on the bookcase's project shelf, at floor position z. */
function book(project: ProjectId, z: number, size: Vec3, color: string): Book {
  return { project, position: [-2.78, PROJECT_SHELF_Y + size[1] / 2, z], size, color };
}

/** One book per project shown by the bookshelf, standing on its middle shelf. */
export const BOOKS: readonly Book[] = [
  book('turnero', -0.86, [0.24, 0.3, 0.07], '#b4245f'),
  book('monogestor', -0.76, [0.24, 0.26, 0.08], '#3f6b5c'),
  book('jobradar', -0.66, [0.24, 0.32, 0.06], '#c9a227'),
];

export function hotspotById(id: HotspotId): Hotspot {
  const hotspot = HOTSPOTS.find((h) => h.id === id);
  if (!hotspot) throw new Error(`Unknown hotspot: ${id}`);
  return hotspot;
}

export function isHotspotId(value: unknown): value is HotspotId {
  return HOTSPOTS.some((h) => h.id === value);
}
