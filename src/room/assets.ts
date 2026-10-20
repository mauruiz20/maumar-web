import { useLoader } from '@react-three/fiber';
import { DefaultLoadingManager } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { MODEL_IDS, modelUrl, type ModelId } from './models';
import { createProgressRelay } from './progress';

/**
 * Loads the Kenney models with R3F's useLoader and three's own GLTFLoader (no drei, no
 * three-stdlib, no Draco). The shipped files are meshopt-compressed (scripts/models.mjs);
 * three's MeshoptDecoder has its WebAssembly inlined, so decoding needs no extra request.
 * R3F keeps one GLTFLoader instance on three's default loading manager, whose progress (items
 * loaded / total) is relayed to the loading screen outside React.
 */
export const loadProgress = createProgressRelay();
DefaultLoadingManager.onProgress = (_url, loaded, total) => loadProgress.report(loaded, total);

const withMeshopt = (loader: GLTFLoader) => {
  loader.setMeshoptDecoder(MeshoptDecoder);
};

export function preloadModels(): void {
  for (const id of MODEL_IDS) useLoader.preload(GLTFLoader, modelUrl(id), withMeshopt);
}

export function useModel(id: ModelId) {
  return useLoader(GLTFLoader, modelUrl(id), withMeshopt);
}
