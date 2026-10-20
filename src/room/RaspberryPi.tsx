import { useContext, useEffect, useMemo } from 'react';
import { MeshStandardMaterial } from 'three';
import { Highlight } from './highlight';
import { PALETTE as C, type PaletteKey } from './palette';
import { PI_PARTS, PI_PLACEMENT, cableGeometry, partGeometry } from './piModel';

/**
 * The owner's Raspberry Pi 5 in its Argon NEO 5 M.2 case, from piModel.ts: one flat-shaded
 * material per palette colour (shared by the parts, glowing together on hover) and the
 * yellow Ethernet cable as one tube in world space.
 */
export function RaspberryPi() {
  const lit = useContext(Highlight);
  const geometries = useMemo(() => PI_PARTS.map((p) => partGeometry(p)), []);
  const cable = useMemo(() => cableGeometry(), []);
  const materials = useMemo(() => {
    const keys = new Set<PaletteKey>([...PI_PARTS.map((p) => p.color), 'cableYellow']);
    return new Map(
      [...keys].map((k) => [k, new MeshStandardMaterial({ color: C[k], roughness: 0.9, metalness: 0, flatShading: true })]),
    );
  }, []);
  useEffect(() => {
    for (const m of materials.values()) {
      m.emissive.set(lit ? C.highlight : '#000000');
      m.emissiveIntensity = lit ? 0.15 : 0;
    }
  }, [lit, materials]);
  useEffect(
    () => () => {
      for (const g of geometries) g.dispose();
      cable.dispose();
      for (const m of materials.values()) m.dispose();
    },
    [geometries, cable, materials],
  );
  return (
    <group name="pi">
      <group position={PI_PLACEMENT.position} rotation={[0, PI_PLACEMENT.rotationY, 0]}>
        {PI_PARTS.map((part, i) => (
          <mesh key={part.name} geometry={geometries[i]} material={materials.get(part.color)} />
        ))}
      </group>
      <mesh geometry={cable} material={materials.get('cableYellow')} />
    </group>
  );
}
