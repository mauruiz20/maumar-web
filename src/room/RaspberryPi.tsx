import { useContext, useEffect, useMemo } from 'react';
import { MeshStandardMaterial } from 'three';
import { Highlight } from './highlight';
import { PALETTE as C, type PaletteKey } from './palette';
import { PI_PARTS, PI_PLACEMENT, WALL_PARTS, partGeometry, powerCableGeometry, type PiPart } from './piModel';

const noRaycast = () => null;

/** Geometry per part and one flat-shaded material per palette colour, disposed on unmount. */
function useParts(parts: readonly PiPart[]) {
  const geometries = useMemo(() => parts.map((p) => partGeometry(p)), [parts]);
  const materials = useMemo(
    () =>
      new Map(
        [...new Set<PaletteKey>([...parts.map((p) => p.color), 'ink'])].map((k) => [
          k,
          new MeshStandardMaterial({ color: C[k], roughness: 0.9, metalness: 0, flatShading: true }),
        ]),
      ),
    [parts],
  );
  useEffect(
    () => () => {
      for (const g of geometries) g.dispose();
      for (const m of materials.values()) m.dispose();
    },
    [geometries, materials],
  );
  return { geometries, materials };
}

/**
 * The owner's Raspberry Pi 5 in its Argon NEO 5 M.2 case, from piModel.ts. Its parts share
 * one material per colour, so the whole case glows together on hover.
 */
export function RaspberryPi() {
  const lit = useContext(Highlight);
  const { geometries, materials } = useParts(PI_PARTS);
  useEffect(() => {
    for (const m of materials.values()) {
      m.emissive.set(lit ? C.highlight : '#000000');
      m.emissiveIntensity = lit ? 0.15 : 0;
    }
  }, [lit, materials]);
  return (
    <group name="pi" position={PI_PLACEMENT.position} rotation={[0, PI_PLACEMENT.rotationY, 0]}>
      {PI_PARTS.map((part, i) => (
        <mesh key={part.name} geometry={geometries[i]} material={materials.get(part.color)} />
      ))}
    </group>
  );
}

/**
 * The Pi's black USB-C power cable, its wall socket and power brick: decoration outside the
 * clickable Pi, so they never take a ray, a hover or a click.
 */
export function PiPower() {
  const { geometries, materials } = useParts(WALL_PARTS);
  const cable = useMemo(() => powerCableGeometry(), []);
  useEffect(() => () => cable.dispose(), [cable]);
  return (
    <group name="pi-power">
      <mesh geometry={cable} material={materials.get('ink')} raycast={noRaycast} />
      {WALL_PARTS.map((part, i) => (
        <mesh key={part.name} geometry={geometries[i]} material={materials.get(part.color)} raycast={noRaycast} />
      ))}
    </group>
  );
}
