import { useGLTF } from '@react-three/drei';
import { DefaultLoadingManager } from 'three';
import { MODEL_IDS, modelUrl, type ModelId } from './models';
import { createProgressRelay } from './progress';

/**
 * Loads the Kenney models with drei's useGLTF. The shipped files are meshopt-compressed
 * (scripts/models.mjs): drei's MeshoptDecoder is three-stdlib's, with the WebAssembly inlined
 * in the chunk, so decoding needs no extra request. Draco stays off (it would fetch its decoder
 * from a CDN). Progress comes from three's default loading manager,
 * which every loader reports to, and is relayed to the loading screen outside React.
 */
export const loadProgress = createProgressRelay();
DefaultLoadingManager.onProgress = (_url, loaded, total) => loadProgress.report(loaded, total);

const NO_DRACO = false;
const MESHOPT = true;

export function preloadModels(): void {
  for (const id of MODEL_IDS) useGLTF.preload(modelUrl(id), NO_DRACO, MESHOPT);
}

export function useModel(id: ModelId) {
  return useGLTF(modelUrl(id), NO_DRACO, MESHOPT);
}
