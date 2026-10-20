/**
 * The Kenney Furniture Kit 2.0 models the room loads (CC0, kenney.nl; License.txt sits next
 * to them in public/models/kenney/). Kept free of three.js imports: boot.ts reads it to
 * start fetching the files while the room's JS chunk downloads.
 */
export const MODEL_FILES = {
  desk: 'desk.glb',
  chairDesk: 'chairDesk.glb',
  computerScreen: 'computerScreen.glb',
  computerKeyboard: 'computerKeyboard.glb',
  computerMouse: 'computerMouse.glb',
  bookcaseOpen: 'bookcaseOpen.glb',
  books: 'books.glb',
  lampRoundTable: 'lampRoundTable.glb',
  pottedPlant: 'pottedPlant.glb',
  rugRectangle: 'rugRectangle.glb',
} as const;

export type ModelId = keyof typeof MODEL_FILES;
export const MODEL_IDS = Object.keys(MODEL_FILES) as ModelId[];

export function modelUrl(id: ModelId): string {
  return `${import.meta.env.BASE_URL.replace(/\/?$/, '/')}models/kenney/${MODEL_FILES[id]}`;
}
