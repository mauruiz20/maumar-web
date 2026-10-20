import { Matrix4, OrthographicCamera, PlaneGeometry, Vector3 } from 'three';
import { DESK, DESK_TOP } from './hotspots';
import { MODEL_BOUNDS, PLACEMENTS, placedBounds } from './layout';
import { PALETTE } from './palette';

/**
 * Contact shadows: soft, low-opacity darkening under the furniture and the desk objects.
 * Each one is captured once (the room is static) by an orthographic camera at a plane,
 * looking up: it sees only what stands within `far` above the plane's rectangle, rendered
 * with a depth material and blurred into a texture shown on that plane.
 *
 * The rectangles stay inside the room and the boxes low enough that nothing outside the
 * window (city, mountains, ground, sky) or the window itself is ever captured.
 *
 * Static: nothing on the desk or the floor moves, and toggling the lamp changes no geometry,
 * so neither is re-rendered. If an object is ever moved or added, bump its `version`
 * (ContactShadow re-captures when it changes).
 */
export interface ShadowSpec {
  /** Floor-plane centre [x, z] and size [width, depth] of the shadow's rectangle. */
  center: readonly [number, number];
  size: readonly [number, number];
  /** Height of the plane; the camera captures from here up to y + far. */
  y: number;
  far: number;
  resolution: number;
  blur: number;
  opacity: number;
  color: string;
}

const RUG_TOP = placedBounds(MODEL_BOUNDS.rugRectangle, PLACEMENTS.rugRectangle).max[1];
/** Above the surface by this much: enough to never z-fight, too little to see. */
const LIFT = 0.002;

export const SHADOWS = {
  // The whole floor, a centimetre in from the walls; over the rug, so it shades the rug too.
  floor: {
    center: [0, 0],
    size: [5.98, 5.98],
    y: RUG_TOP + LIFT,
    far: 0.6,
    resolution: 512,
    blur: 2.5,
    opacity: 0.5,
    color: PALETTE.ink,
  },
  desk: {
    center: [DESK.center[0], DESK.center[1]],
    size: [DESK.size[0], DESK.size[1]],
    y: DESK_TOP + LIFT,
    far: 0.35,
    resolution: 256,
    blur: 1.6,
    opacity: 0.45,
    color: PALETTE.ink,
  },
} as const satisfies Record<string, ShadowSpec>;

/**
 * The capture camera: at the plane's centre, looking straight up, image right = +x and image
 * up = +z (so shadowPlane's uv lines up with it).
 */
export function shadowCamera(spec: ShadowSpec): OrthographicCamera {
  const [w, d] = spec.size;
  const [cx, cz] = spec.center;
  const camera = new OrthographicCamera(-w / 2, w / 2, d / 2, -d / 2, 0, spec.far);
  camera.position.set(cx, spec.y, cz);
  camera.up.set(0, 0, 1);
  camera.lookAt(new Vector3(cx, spec.y + 1, cz));
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  return camera;
}

/** The plane that shows the shadow: geometry facing up (uv as the camera sees it) and its world matrix. */
export function shadowPlane(spec: ShadowSpec): { geometry: PlaneGeometry; matrix: Matrix4 } {
  const [w, d] = spec.size;
  const [cx, cz] = spec.center;
  const geometry = new PlaneGeometry(w, d).rotateX(-Math.PI / 2);
  // Rotated, its v runs towards -z; the camera's image runs towards +z: flip v.
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  uv.needsUpdate = true;
  return { geometry, matrix: new Matrix4().makeTranslation(cx, spec.y, cz) };
}
