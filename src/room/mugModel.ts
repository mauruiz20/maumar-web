import { CylinderGeometry } from 'three';

/**
 * The mug (Scene.tsx draws it) and the printed icon wrapped round its side. Local frame:
 * centred on the mug, y up; +x is the handle; theta 0 faces +z, as in three's cylinders.
 */
export const MUG = {
  radius: 0.04,
  height: 0.1,
  band: { radius: 0.0405, height: 0.025, y: 0.015 },
  handle: { width: 0.012, height: 0.06, depth: 0.02, x: 0.048 },
} as const;

/**
 * The icon (mugIcon.svg) on a thin open cylinder segment 1 mm outside the body, between the
 * base and the accent band, centred on the side the mug close-ups look at (about 29°
 * towards the handle) and well clear of the handle. The canvas has the decal's aspect.
 */
export const MUG_DECAL = {
  radius: MUG.radius + 0.001,
  height: 0.034,
  centerY: -0.025,
  thetaCenter: (29 * Math.PI) / 180,
  thetaLength: (70 * Math.PI) / 180,
  canvas: [512, 348] as const,
} as const;

export function mugDecalGeometry(): CylinderGeometry {
  const { radius, height, centerY, thetaCenter, thetaLength } = MUG_DECAL;
  const g = new CylinderGeometry(radius, radius, height, 24, 1, true, thetaCenter - thetaLength / 2, thetaLength);
  g.translate(0, centerY, 0);
  return g;
}
