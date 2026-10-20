import { DESK_TOP, HOTSPOTS, onDesk, type Hotspot, type HotspotId, type Vec3 } from './hotspots';

/**
 * Where the camera is: the overview, the desk group view (touch screens only), or a hotspot.
 * The four desk objects sit too close together for one tap marker each in the touch
 * overview, so there they share a single "Desk" marker that opens the desk view, where
 * their own markers spread out.
 */
export type Place = 'overview' | 'desk' | HotspotId;
export type MarkerId = 'desk' | HotspotId;

export const DESK_GROUP = ['monitor', 'pi', 'phone', 'mug'] as const satisfies readonly HotspotId[];
type DeskId = (typeof DESK_GROUP)[number];

const inDeskGroup = (id: HotspotId): id is DeskId => (DESK_GROUP as readonly HotspotId[]).includes(id);

/** The desk group view: no panel, no sheet; portrait shows the whole desktop. */
export const DESK_VIEW: Pick<Hotspot, 'view' | 'portraitView'> = {
  view: { position: [0, 1.75, -0.6], target: [0, 0.85, -2.45] },
  portraitView: { position: [0, 2.15, 0.05], target: [0, 0.85, -2.45] },
};

/** The overview's desk marker floats over the monitor. */
const DESK_MARKER: Vec3 = [0, 1.45, -2.6];

/**
 * In the desk view each marker stays over its object, at staggered heights so neighbours on
 * screen (the mug and the Pi are 22 cm apart) are far enough apart to tap.
 */
const DESK_VIEW_MARKERS: Record<DeskId, Vec3> = {
  monitor: [0, 1.5, -2.62],
  phone: onDesk('phone', DESK_TOP + 0.2),
  mug: onDesk('mug', DESK_TOP + 0.12),
  pi: onDesk('pi', DESK_TOP + 0.48),
};

/** Which markers show: touch overview → desk + the rest; desk view → the four desk ones. */
export function visibleMarkers({ compact, place }: { compact: boolean; place: Place }): MarkerId[] {
  if (!compact) return [];
  if (place === 'overview') return ['desk', ...HOTSPOTS.map((h) => h.id).filter((id) => !inDeskGroup(id))];
  if (place === 'desk') return [...DESK_GROUP];
  return [];
}

export function markerPosition(id: MarkerId, place: Place): Vec3 {
  if (id === 'desk') return DESK_MARKER;
  if (place === 'desk' && inDeskGroup(id)) return DESK_VIEW_MARKERS[id];
  return HOTSPOTS.find((h) => h.id === id)!.marker;
}

/** Back stack, newest last; empty means the overview. */
export type NavStack = readonly Place[];

export type NavAction =
  | { type: 'desk' }
  | { type: 'back' }
  /** `source`: a scene object or tap marker, or the HTML object menu. */
  | { type: 'open'; id: HotspotId; source: 'scene' | 'menu' };

export function placeOf(stack: NavStack): Place {
  return stack[stack.length - 1] ?? 'overview';
}

/**
 * The Back rule: a desk object opened from the desk view (or from another desk object
 * opened there) goes back to the desk view; anything chosen from the menu, and any other
 * object, opens directly and goes back to the overview.
 */
export function navigate(stack: NavStack, action: NavAction): NavStack {
  switch (action.type) {
    case 'back':
      return stack.slice(0, -1);
    case 'desk':
      return ['desk'];
    case 'open': {
      if (placeOf(stack) === action.id) return stack;
      const viaDesk = action.source === 'scene' && stack[0] === 'desk' && inDeskGroup(action.id);
      return viaDesk ? ['desk', action.id] : [action.id];
    }
  }
}
