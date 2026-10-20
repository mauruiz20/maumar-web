import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  AlwaysStencilFunc,
  BackSide,
  Color,
  EqualStencilFunc,
  Float32BufferAttribute,
  Object3D,
  ReplaceStencilOp,
  SphereGeometry,
  type InstancedMesh,
} from 'three';
import { GROUND_Y, generateCity, generateRidge, mulberry32, ridgeTriangles, type Building } from './city';
import { WINDOW } from './hotspots';
import { PALETTE } from './palette';

/**
 * The view out of the window. Purely decorative: nothing here is raycastable, so it never
 * takes a click, a hover or a tap. Everything outside is drawn only where the window's
 * stencil mask was written, so the city never shows past the edges of the room (the room
 * has no right wall or ceiling) and no gap in the walls can leak it.
 */
const SEED = 7;
const STENCIL_REF = 1;
const SKY_RADIUS = 150;
/** Gradient from the horizon colour at height SKY.from × radius to the top colour at SKY.to × radius. */
const SKY = { top: PALETTE.sky, horizon: '#dde9ee', from: -0.1, to: 0.06 } as const;
const GROUND = '#b4b9a7';

const noRaycast = () => null;
/** Material props for everything outside: drawn only inside the window's mask. */
const OUTSIDE = { stencilWrite: true, stencilRef: STENCIL_REF, stencilFunc: EqualStencilFunc } as const;

/** Writes the stencil over the window opening before anything else is drawn; no colour, no depth. */
function WindowMask() {
  const [x, y] = WINDOW.center;
  return (
    <mesh position={[x, y, -3.05]} renderOrder={-1} raycast={noRaycast}>
      <planeGeometry args={[...WINDOW.size]} />
      <meshBasicMaterial
        colorWrite={false}
        depthWrite={false}
        stencilWrite
        stencilRef={STENCIL_REF}
        stencilFunc={AlwaysStencilFunc}
        stencilZPass={ReplaceStencilOp}
      />
    </mesh>
  );
}

/** Every building in one draw call: a unit box per instance, scaled, with its own colour. */
function City({ buildings }: { buildings: Building[] }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new Object3D();
    const color = new Color();
    buildings.forEach((b, i) => {
      o.position.set(...b.position);
      o.scale.set(...b.size);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      mesh.setColorAt(i, color.set(b.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [buildings]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, buildings.length]} raycast={noRaycast}>
      <boxGeometry />
      <meshLambertMaterial {...OUTSIDE} />
    </instancedMesh>
  );
}

/** Mountain ranges and the street in one mesh, coloured per vertex and flat shaded. */
function Terrain() {
  const { positions, colors } = useMemo(() => {
    const pos: number[] = [];
    const col: number[] = [];
    const rand = mulberry32(SEED);
    const base = new Color();
    const c = new Color();
    /** One colour per triangle, slightly varied, so the facets read as low-poly. */
    const paint = (hex: string, from: number, vary: number) => {
      base.set(hex);
      for (let i = from; i < pos.length; i += 9) {
        c.copy(base).multiplyScalar(1 - vary / 2 + rand() * vary);
        col.push(c.r, c.g, c.b, c.r, c.g, c.b, c.r, c.g, c.b);
      }
    };
    for (const ridge of generateRidge(SEED)) {
      const from = pos.length;
      pos.push(...ridgeTriangles(ridge));
      paint(ridge.color, from, 0.16);
    }
    const from = pos.length;
    const [l, r, near, far] = [-110, 110, -3.2, -110];
    pos.push(l, GROUND_Y, near, r, GROUND_Y, near, r, GROUND_Y, far, l, GROUND_Y, near, r, GROUND_Y, far, l, GROUND_Y, far);
    paint(GROUND, from, 0);
    return { positions: new Float32Array(pos), colors: new Float32Array(col) };
  }, []);
  return (
    <mesh raycast={noRaycast}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <meshLambertMaterial vertexColors flatShading {...OUTSIDE} />
    </mesh>
  );
}

/** A big inside-out sphere, light blue overhead fading to pale at the horizon. */
function Sky() {
  const geometry = useMemo(() => {
    const g = new SphereGeometry(SKY_RADIUS, 24, 12);
    const top = new Color(SKY.top);
    const horizon = new Color(SKY.horizon);
    const c = new Color();
    const y = g.attributes.position!;
    const col: number[] = [];
    for (let i = 0; i < y.count; i++) {
      const t = Math.min(1, Math.max(0, (y.getY(i) / SKY_RADIUS - SKY.from) / (SKY.to - SKY.from)));
      c.copy(horizon).lerp(top, t * t * (3 - 2 * t));
      col.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new Float32BufferAttribute(col, 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} raycast={noRaycast}>
      <meshBasicMaterial vertexColors side={BackSide} toneMapped={false} {...OUTSIDE} />
    </mesh>
  );
}

export function Outside() {
  const buildings = useMemo(() => generateCity(SEED), []);
  return (
    <group name="outside">
      <WindowMask />
      <City buildings={buildings} />
      <Terrain />
      <Sky />
    </group>
  );
}
