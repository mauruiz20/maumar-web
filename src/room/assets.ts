import { useGLTF } from '@react-three/drei';
import { DefaultLoadingManager } from 'three';
import { MODEL_IDS, modelUrl, type ModelId } from './models';
import { createProgressRelay } from './progress';

/**
 * Loads the Kenney models with drei's useGLTF: plain GLTFLoader, no Draco, no meshopt (the
 * files are small and uncompressed). Progress comes from three's default loading manager,
 * which every loader reports to, and is relayed to the loading screen outside React.
 */
export const loadProgress = createProgressRelay();
DefaultLoadingManager.onProgress = (_url, loaded, total) => loadProgress.report(loaded, total);

const NO_DRACO = false;
const NO_MESHOPT = false;

export function preloadModels(): void {
  for (const id of MODEL_IDS) useGLTF.preload(modelUrl(id), NO_DRACO, NO_MESHOPT);
}

export function useModel(id: ModelId) {
  return useGLTF(modelUrl(id), NO_DRACO, NO_MESHOPT);
}
