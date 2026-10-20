import {
  AmbientLight,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  ShaderMaterial,
} from 'three';

/**
 * The three classes the room's JSX creates, registered with R3F's extend() instead of the
 * whole namespace (what <Canvas> does), so everything else in three is tree-shaken out.
 * tests/catalogue.test.ts scans the room's .tsx files (and drei's <Html>, which creates a
 * group and, for blending occlusion, a mesh with a plane and a shader material) and fails if
 * an element is missing here.
 */
export const CATALOGUE = {
  AmbientLight,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  ShaderMaterial,
};
