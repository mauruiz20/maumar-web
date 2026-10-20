import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  Color,
  Mesh,
  MeshDepthMaterial,
  OrthographicCamera,
  PlaneGeometry,
  ShaderMaterial,
  WebGLRenderTarget,
  type Mesh as MeshType,
} from 'three';
import { HorizontalBlurShader } from 'three/examples/jsm/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/examples/jsm/shaders/VerticalBlurShader.js';
import { shadowCamera, shadowPlane, type ShadowSpec } from './shadows';

const noRaycast = () => null;

/**
 * One contact shadow (see shadows.ts), captured once: on the first frame, and again only if
 * `version` changes. It works like drei's <ContactShadows frames={1}> (depth from below,
 * tinted, blurred twice), without drei's per-render recapture or three-stdlib, and it
 * disposes its render targets, materials and geometries when it unmounts. After the capture
 * it costs one transparent textured plane per frame.
 */
export function ContactShadow({ spec, version = 0 }: { spec: ShadowSpec; version?: number }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const plane = useRef<MeshType>(null);
  const captured = useRef<number | null>(null);

  const rig = useMemo(() => {
    const camera = shadowCamera(spec);
    const { geometry, matrix } = shadowPlane(spec);
    const target = new WebGLRenderTarget(spec.resolution, spec.resolution);
    const blurTarget = new WebGLRenderTarget(spec.resolution, spec.resolution);
    target.texture.generateMipmaps = blurTarget.texture.generateMipmaps = false;

    // Depth from below, tinted and fading with height: dark where things touch the plane.
    const depth = new MeshDepthMaterial();
    depth.depthTest = depth.depthWrite = false;
    const tint = new Color(spec.color);
    depth.onBeforeCompile = (shader) => {
      shader.uniforms.ucolor = { value: tint };
      shader.fragmentShader = shader.fragmentShader
        .replace('void main() {', 'uniform vec3 ucolor;\nvoid main() {')
        .replace('vec4( vec3( 1.0 - fragCoordZ ), opacity );', 'vec4( ucolor * fragCoordZ * 2.0, 1.0 - fragCoordZ );');
    };

    const horizontal = new ShaderMaterial(HorizontalBlurShader);
    const vertical = new ShaderMaterial(VerticalBlurShader);
    horizontal.depthTest = vertical.depthTest = false;
    // A full-screen quad for the blur passes.
    const quadGeometry = new PlaneGeometry(2, 2);
    const quad = new Mesh(quadGeometry, horizontal);
    quad.position.z = -0.5;
    const quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    quad.updateMatrixWorld();
    return { camera, geometry, matrix, target, blurTarget, depth, horizontal, vertical, quad, quadGeometry, quadCamera };
  }, [spec]);

  useEffect(
    () => () => {
      for (const d of [rig.geometry, rig.quadGeometry, rig.target, rig.blurTarget, rig.depth, rig.horizontal, rig.vertical]) d.dispose();
    },
    [rig],
  );

  useFrame(() => {
    const mesh = plane.current;
    if (!mesh || captured.current === version) return;
    captured.current = version;
    const { camera, target, blurTarget, depth, horizontal, vertical, quad, quadCamera } = rig;
    const background = scene.background;
    const override = scene.overrideMaterial;
    mesh.visible = false;
    scene.background = null;
    scene.overrideMaterial = depth;
    gl.setRenderTarget(target);
    gl.render(scene, camera);
    // Two blur passes, the second finer, as drei does with `smooth`.
    for (const amount of [spec.blur, spec.blur * 0.4]) {
      quad.material = horizontal;
      horizontal.uniforms.tDiffuse!.value = target.texture;
      horizontal.uniforms.h!.value = amount / spec.resolution;
      gl.setRenderTarget(blurTarget);
      gl.render(quad, quadCamera);
      quad.material = vertical;
      vertical.uniforms.tDiffuse!.value = blurTarget.texture;
      vertical.uniforms.v!.value = amount / spec.resolution;
      gl.setRenderTarget(target);
      gl.render(quad, quadCamera);
    }
    gl.setRenderTarget(null);
    scene.overrideMaterial = override;
    scene.background = background;
    mesh.visible = true;
  });

  return (
    <mesh ref={plane} geometry={rig.geometry} matrixAutoUpdate={false} matrix={rig.matrix} raycast={noRaycast} visible={false}>
      <meshBasicMaterial map={rig.target.texture} transparent opacity={spec.opacity} depthWrite={false} />
    </mesh>
  );
}
