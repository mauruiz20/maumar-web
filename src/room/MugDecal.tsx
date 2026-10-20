import { useThree } from '@react-three/fiber';
import { useContext, useEffect, useMemo } from 'react';
import { CanvasTexture, MeshStandardMaterial, SRGBColorSpace } from 'three';
import { Highlight } from './highlight';
import iconSvg from './mugIcon.svg?raw';
import { MUG_DECAL, mugDecalGeometry } from './mugModel';
import { PALETTE as C } from './palette';

const noRaycast = () => null;

/**
 * The printed icon on the mug: mugIcon.svg rasterised once to a canvas (no network: the SVG
 * is inlined in the chunk), used as a transparent texture on a thin cylinder segment just
 * outside the body. It takes no rays (the mug group is the click target) and glows with the
 * mug on hover.
 */
export function MugDecal() {
  const gl = useThree((s) => s.gl);
  const lit = useContext(Highlight);
  const { geometry, texture, material } = useMemo(() => {
    const [w, h] = MUG_DECAL.canvas;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
    const material = new MeshStandardMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      roughness: 1,
      metalness: 0,
    });
    return { geometry: mugDecalGeometry(), texture, material, canvas };
  }, [gl]);

  useEffect(() => {
    let live = true;
    const image = new Image();
    image.onload = () => {
      const canvas = texture.image as HTMLCanvasElement;
      const ctx = canvas.getContext('2d');
      if (!live || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      texture.needsUpdate = true;
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconSvg)}`;
    return () => {
      live = false;
      geometry.dispose();
      texture.dispose();
      material.dispose();
    };
  }, [geometry, texture, material]);

  useEffect(() => {
    material.emissive.set(lit ? C.highlight : '#000000');
    material.emissiveIntensity = lit ? 0.15 : 0;
  }, [lit, material]);

  return <mesh geometry={geometry} material={material} raycast={noRaycast} />;
}
