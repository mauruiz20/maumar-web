import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { gsap } from 'gsap';
import { useEffect, useRef } from 'react';
import { Vector3, type PerspectiveCamera } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { FOV, OVERVIEW, OVERVIEW_PORTRAIT, panelShift, viewFor, type CameraView, type Hotspot, type PanelKind } from './hotspots';

export { FOV };

/** Spherical angles of the overview camera around its target, for the orbit limits. */
function anglesOf(view: CameraView) {
  const [px, py, pz] = view.position;
  const [tx, ty, tz] = view.target;
  const dx = px - tx;
  const dy = py - ty;
  const dz = pz - tz;
  const distance = Math.hypot(dx, dy, dz);
  return { azimuth: Math.atan2(dx, dz), polar: Math.acos(dy / distance), distance };
}

interface Props {
  /** The active hotspot, or null for the overview. */
  hotspot: Hotspot | null;
  reducedMotion: boolean;
  /** An HTML panel covering part of the canvas: the framed object shifts away from it. */
  panel: PanelKind | null;
}

/**
 * Overview: OrbitControls with a tight orbit around the desk, no pan, clamped zoom.
 * Hotspot views: controls off, GSAP tweens the camera and its look-at target (~1 s),
 * or cuts instantly under prefers-reduced-motion.
 */
export function CameraRig({ hotspot, reducedMotion, panel }: Props) {
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const portrait = size.width < size.height;
  const shift = useRef({ x: 0, y: 0 });
  const overview = portrait ? OVERVIEW_PORTRAIT : OVERVIEW;
  // Portrait canvases use each hotspot's portrait view (framed above the bottom sheet).
  const view = hotspot ? viewFor(hotspot, size.width / size.height) : null;
  const { azimuth, polar, distance } = anglesOf(overview);

  useEffect(() => {
    camera.fov = portrait ? FOV.portrait : FOV.landscape;
    camera.updateProjectionMatrix();
  }, [camera, portrait]);

  // Off-centre framing with setViewOffset, so the panel never hides the object.
  useEffect(() => {
    const { width, height } = size;
    const to = panelShift(panel, portrait);
    const apply = () => {
      const { x, y } = shift.current;
      if (x === 0 && y === 0) camera.clearViewOffset();
      else camera.setViewOffset(width, height, x * width, y * height, width, height);
    };
    if (reducedMotion) {
      shift.current = { ...to };
      apply();
      return;
    }
    const tween = gsap.to(shift.current, { ...to, duration: 1, ease: 'power2.inOut', onUpdate: apply, onComplete: apply });
    return () => {
      tween.kill();
    };
  }, [panel, portrait, size, camera, reducedMotion]);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const dest = view ?? overview;
    const look = c.target;
    c.enabled = false;
    const finish = () => {
      if (view) return;
      c.enabled = true;
      c.update();
    };

    const there =
      camera.position.distanceTo(new Vector3(...dest.position)) < 1e-3 &&
      look.distanceTo(new Vector3(...dest.target)) < 1e-3;

    if (reducedMotion || there) {
      camera.position.set(...dest.position);
      look.set(...dest.target);
      camera.lookAt(look);
      finish();
      return;
    }

    const [x, y, z] = dest.position;
    const [tx, ty, tz] = dest.target;
    const ease = 'power2.inOut';
    const move = gsap.to(camera.position, { x, y, z, duration: 1, ease });
    const aim = gsap.to(look, {
      x: tx,
      y: ty,
      z: tz,
      duration: 1,
      ease,
      onUpdate: () => camera.lookAt(look),
      onComplete: finish,
    });
    return () => {
      move.kill();
      aim.kill();
    };
  }, [view, overview, reducedMotion, camera]);

  const spread = 0.38;
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={overview.target as [number, number, number]}
      enablePan={false}
      minAzimuthAngle={azimuth - spread}
      maxAzimuthAngle={azimuth + spread}
      minPolarAngle={polar - 0.25}
      maxPolarAngle={Math.min(polar + 0.12, Math.PI / 2 - 0.05)}
      minDistance={distance * 0.8}
      maxDistance={distance * 1.12}
      rotateSpeed={0.5}
      zoomSpeed={0.6}
    />
  );
}
