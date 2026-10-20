import { useFrame } from '@react-three/fiber';
import { useContext, useEffect, useMemo } from 'react';
import { MeshStandardMaterial } from 'three';
import { Highlight } from './highlight';
import { PALETTE as C, type PaletteKey } from './palette';
import { PI_LED, PI_PARTS, PI_PLACEMENT, ledIntensity, partGeometry } from './piModel';

const noRaycast = () => null;

/**
 * The owner's Raspberry Pi 5 in its Argon NEO 5 M.2 case, from piModel.ts. Its parts share
 * one material per colour, so the whole case glows together on hover. The green status LED
 * is its own mesh: it breathes (steady under prefers-reduced-motion), takes no rays (the
 * case around it is the hit target), and needs no light of its own.
 */
export function RaspberryPi({ reducedMotion }: { reducedMotion: boolean }) {
  const lit = useContext(Highlight);
  const geometries = useMemo(() => PI_PARTS.map((p) => partGeometry(p)), []);
  const led = useMemo(() => partGeometry(PI_LED), []);
  const materials = useMemo(
    () =>
      new Map(
        [...new Set<PaletteKey>(PI_PARTS.map((p) => p.color))].map((k) => [
          k,
          new MeshStandardMaterial({ color: C[k], roughness: 0.9, metalness: 0, flatShading: true }),
        ]),
      ),
    [],
  );
  const ledMaterial = useMemo(
    () => new MeshStandardMaterial({ color: '#0d2a17', emissive: C.ledGreen, emissiveIntensity: ledIntensity(0, reducedMotion) }),
    [reducedMotion],
  );
  useEffect(() => {
    for (const m of materials.values()) {
      m.emissive.set(lit ? C.highlight : '#000000');
      m.emissiveIntensity = lit ? 0.15 : 0;
    }
  }, [lit, materials]);
  useFrame(({ clock }) => {
    ledMaterial.emissiveIntensity = ledIntensity(clock.elapsedTime, reducedMotion);
  });
  useEffect(
    () => () => {
      for (const g of geometries) g.dispose();
      led.dispose();
      for (const m of materials.values()) m.dispose();
    },
    [geometries, led, materials],
  );
  useEffect(() => () => ledMaterial.dispose(), [ledMaterial]);
  return (
    <group name="pi" position={PI_PLACEMENT.position} rotation={[0, PI_PLACEMENT.rotationY, 0]}>
      {PI_PARTS.map((part, i) => (
        <mesh key={part.name} geometry={geometries[i]} material={materials.get(part.color)} />
      ))}
      <mesh geometry={led} material={ledMaterial} raycast={noRaycast} />
    </group>
  );
}
