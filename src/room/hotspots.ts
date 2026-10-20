import type { Project } from '../content/profile';

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

export type HotspotId = 'monitor' | 'bookshelf' | 'whiteboard' | 'pi' | 'phone' | 'mug';
export type ProjectId = Project['id'];

/** What a hotspot shows. The text itself always comes from the en/es content objects. */
export type HotspotContent =
  | { kind: 'experience' }
  | { kind: 'projects'; projects: ProjectId[] }
  | { kind: 'skills' }
  | { kind: 'project'; project: ProjectId }
  | { kind: 'contact' }
  | { kind: 'education' };

export interface Hotspot {
  id: HotspotId;
  /** Scene objects that react to the click (the monitor view also seats you in the chair). */
  objects: string[];
  view: CameraView;
  content: HotspotContent;
  /** Where the tap marker floats on touch screens. */
  marker: Vec3;
}

export const DESK_TOP = 0.75;
/** Desktop footprint on the floor plane: centre [x, z] and size [width, depth]. */
export const DESK = { center: [0, -2.5], size: [1.6, 0.8] } as const;
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

export const OVERVIEW: CameraView = { position: [3.1, 2.5, 3.3], target: [-0.6, 0.95, -0.9] };
/** Portrait screens (with a 70° FOV): further back, so every tap marker fits the width. */
export const OVERVIEW_PORTRAIT: CameraView = { position: [3.5, 4, 7.5], target: [-0.9, 1, -2] };

export const HOTSPOTS: readonly Hotspot[] = [
  {
    id: 'monitor',
    objects: ['monitor', 'chair'],
    view: { position: [0, 1.13, -1.65], target: [0, 1.13, -2.6] },
    content: { kind: 'experience' },
    marker: [0, 1.4, -2.62],
  },
  {
    id: 'bookshelf',
    objects: ['bookshelf'],
    view: { position: [-0.9, 1.3, -0.6], target: [-2.8, 1.15, -0.6] },
    content: { kind: 'projects', projects: ['turnero', 'monogestor', 'jobradar'] },
    marker: [-2.7, 2.05, -0.6],
  },
  {
    id: 'whiteboard',
    objects: ['whiteboard'],
    view: { position: [-1.75, 1.5, -0.95], target: [-1.75, 1.5, -2.97] },
    content: { kind: 'skills' },
    marker: [-1.75, 2.05, -2.9],
  },
  {
    id: 'pi',
    objects: ['pi'],
    view: { position: [0.95, 1.22, -1.7], target: onDesk('pi', DESK_TOP + 0.02) },
    content: { kind: 'project', project: 'home-server' },
    marker: onDesk('pi', DESK_TOP + 0.16),
  },
  {
    id: 'phone',
    objects: ['phone'],
    // From the left of the desk: the chair (x within ±0.24) would block a view from the front.
    view: { position: [-0.66, 1.22, -1.82], target: onDesk('phone', DESK_TOP) },
    content: { kind: 'contact' },
    marker: onDesk('phone', DESK_TOP + 0.14),
  },
  {
    id: 'mug',
    objects: ['mug'],
    view: { position: [0.72, 1.18, -1.62], target: onDesk('mug', DESK_TOP + 0.05) },
    content: { kind: 'education' },
    marker: onDesk('mug', DESK_TOP + 0.22),
  },
];

/** Not clickable as hotspots. The lamp only toggles its light (an easter egg). */
export const DECOR = ['lamp', 'window', 'plant', 'rug', 'frame'] as const;

export interface Book {
  project: ProjectId;
  position: Vec3;
  size: Vec3;
  color: string;
}

/** One book per project shown by the bookshelf, standing on its middle shelf. */
export const BOOKS: readonly Book[] = [
  { project: 'turnero', position: [-2.78, 1.27, -0.86], size: [0.24, 0.3, 0.07], color: '#b4245f' },
  { project: 'monogestor', position: [-2.78, 1.25, -0.76], size: [0.24, 0.26, 0.08], color: '#3f6b5c' },
  { project: 'jobradar', position: [-2.78, 1.28, -0.66], size: [0.24, 0.32, 0.06], color: '#c9a227' },
];

export function hotspotById(id: HotspotId): Hotspot {
  const hotspot = HOTSPOTS.find((h) => h.id === id);
  if (!hotspot) throw new Error(`Unknown hotspot: ${id}`);
  return hotspot;
}

export function isHotspotId(value: unknown): value is HotspotId {
  return HOTSPOTS.some((h) => h.id === value);
}
