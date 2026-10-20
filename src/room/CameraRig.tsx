import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Vector3, type PerspectiveCamera } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createTweens, tween } from './tween';
import { FOV, OVERVIEW, OVERVIEW_PORTRAIT, panelShift, viewFor, type CameraView, type Hotspot, type PanelKind } from './hotspots';

/** Anything the camera can frame besides the overview: a hotspot or the desk group view. */
export type Framing = Pick<Hotspot, 'view' | 'portraitView'>;

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
  /** The active hotspot or the desk view, or null for the overview. */
  framing: Framing | null;
  reducedMotion: boolean;
  /** An HTML panel covering part of the canvas: the framed object shifts away from it. */
  panel: PanelKind | null;
}

/**
 * three's own OrbitControls, wired the way drei's <OrbitControls makeDefault> did (so drei and
 * three-stdlib stay out of the chunk): damping on, connected to R3F's event source, updated
 * every frame before rendering, registered as the default controls.
 */
function useOrbitControls(): OrbitControls {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const connected = useThree((s) => s.events.connected) as HTMLElement | undefined;
  const set = useThree((s) => s.set);
  const get = useThree((s) => s.get);
  const controls = useMemo(() => {
    const c = new OrbitControls(camera);
    c.enableDamping = true;
    return c;
  }, [camera]);
  useEffect(() => {
    controls.connect(connected ?? gl.domElement);
    return () => controls.dispose();
  }, [controls, connected, gl]);
  useEffect(() => {
    const old = get().controls;
    set({ controls });
    return () => set({ controls: old });
  }, [controls, get, set]);
  useFrame(() => {
    if (controls.enabled) controls.update();
  }, -1);
  return controls;
}

/**
 * Overview: OrbitControls with a tight orbit around the desk, no pan, clamped zoom.
 * Hotspot views: controls off, the camera and its look-at target tween (~1 s, power2.inOut,
 * stepped by the frame loop),
 * or cuts instantly under prefers-reduced-motion.
 */
export function CameraRig({ framing, reducedMotion, panel }: Props) {
  const c = useOrbitControls();
  const tweens = useMemo(createTweens, []);
  // After the controls (priority -1), before the frame renders.
  useFrame((_, dt) => tweens.step(dt));
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const portrait = size.width < size.height;
  const shift = useRef({ x: 0, y: 0 });
  const overview = portrait ? OVERVIEW_PORTRAIT : OVERVIEW;
  // Portrait canvases use each hotspot's portrait view (framed above the bottom sheet).
  const view = framing ? viewFor(framing, size.width / size.height) : null;
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
    const move = tweens.add(tween(shift.current, to, { duration: 1, onUpdate: apply }));
    return () => move.cancel();
  }, [panel, portrait, size, camera, reducedMotion, tweens]);

  useEffect(() => {
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
    const move = tweens.add(tween(camera.position, { x, y, z }, { duration: 1 }));
    const aim = tweens.add(
      tween(look, { x: tx, y: ty, z: tz }, { duration: 1, onUpdate: () => camera.lookAt(look), onComplete: finish }),
    );
    return () => {
      move.cancel();
      aim.cancel();
    };
  }, [view, overview, reducedMotion, camera, c, tweens]);

  const spread = 0.38;
  return (
    <primitive
      object={c}
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
