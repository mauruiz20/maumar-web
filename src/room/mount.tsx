import { createRoot } from 'react-dom/client';
import { en } from '../content/en';
import { es } from '../content/es';
import { RoomApp } from './RoomApp';
// Inlined as a string: a plain CSS import would make Astro link it from every page.
import css from './room.css?inline';

export interface MountOptions {
  lang: string;
  coarse: boolean;
  reducedMotion: boolean;
  onReady: () => void;
  onFail: (error: unknown) => void;
}

/**
 * Renders the room into `container` and returns the unmount function. Unmounting the
 * R3F <Canvas> disposes the scene and forces the WebGL context loss.
 */
export function mountRoom(container: HTMLElement, opts: MountOptions): () => void {
  const content = opts.lang === 'es' ? es : en;
  const style = document.createElement('style');
  style.dataset.room = '';
  style.textContent = css;
  document.head.append(style);
  const root = createRoot(container, {
    onUncaughtError: (error) => opts.onFail(error),
  });
  root.render(
    <RoomApp content={content} coarse={opts.coarse} reducedMotion={opts.reducedMotion} onReady={opts.onReady} />,
  );
  return () => {
    root.unmount();
    style.remove();
  };
}
