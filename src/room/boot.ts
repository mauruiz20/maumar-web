import { BOOT_CLAIM_KEY, LOAD_TIMEOUT_MS, MODE_KEY, type SavedMode } from '../lib/mode';
import { startVisibleTimer } from '../lib/visibleTimer';
import { MODEL_IDS, modelUrl } from './models';

/**
 * Runtime half of the gate (the decision itself runs inline in <head>, see GATE_SCRIPT).
 * Shows the "View the 3D room" button when WebGL works, opens the room when the gate said
 * so or the visitor asked, and closes it back to the simple page. The room bundle
 * (React, three, R3F, drei's <Html>) is only fetched by start().
 */

const html = document.documentElement;

function save(mode: SavedMode): void {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // Storage blocked: the choice simply is not remembered.
  }
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return gl !== null;
  } catch {
    return false;
  }
}

/**
 * Starts downloading the models while the room's JS chunk loads. Injected only when the room
 * starts (never in the static HTML), so simple-mode visitors never fetch them. `as=fetch`
 * with `crossorigin` (anonymous: same-origin credentials) matches the request GLTFLoader
 * makes later, so it is served from the preload instead of downloading again.
 */
function preloadModels(): void {
  for (const id of MODEL_IDS) {
    const href = modelUrl(id);
    if (document.head.querySelector(`link[rel="preload"][href="${href}"]`)) continue;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'fetch';
    link.crossOrigin = 'anonymous';
    link.href = href;
    document.head.append(link);
  }
}

export function initRoomGate(): void {
  const root = document.getElementById('room-root');
  const app = root?.querySelector<HTMLElement>('[data-room-app]');
  const exit = root?.querySelector<HTMLButtonElement>('[data-room-exit]');
  const bar = root?.querySelector<HTMLElement>('[data-room-progress]');
  const percent = root?.querySelector<HTMLElement>('[data-room-progress-text]');
  const enter = document.getElementById('room-enter') as HTMLButtonElement | null;
  if (!root || !app || !exit) return;
  // Tell the inline gate's fallback timer that the loading screen is in good hands.
  html.dataset[BOOT_CLAIM_KEY] = '1';

  let unmount: (() => void) | null = null;
  let starting = false;
  // Bumped on every stop(), so a start() still loading knows it was cancelled.
  let session = 0;
  // Counts only visible time: hidden tabs never paint, so the room cannot get ready there.
  let cancelLoadTimer: (() => void) | undefined;

  const setPageInert = (on: boolean) => {
    for (const el of Array.from(document.body.children)) {
      if (el !== root) el.toggleAttribute('inert', on);
    }
  };

  /** null: indeterminate (nothing loaded yet); otherwise 0..1. */
  const showProgress = (fraction: number | null) => {
    if (!bar) return;
    if (fraction === null) {
      delete bar.dataset.determinate;
      bar.removeAttribute('aria-valuenow');
      bar.style.removeProperty('--room-progress');
      if (percent) percent.textContent = '';
      return;
    }
    const value = Math.round(fraction * 100);
    bar.dataset.determinate = '';
    bar.setAttribute('aria-valuenow', String(value));
    bar.style.setProperty('--room-progress', `${value}%`);
    if (percent) percent.textContent = `${value}%`;
  };

  const stop = () => {
    session += 1;
    starting = false;
    cancelLoadTimer?.();
    const done = unmount;
    unmount = null;
    done?.();
    delete html.dataset.room;
    delete root.dataset.state;
    root.hidden = true;
    setPageInert(false);
    const back = enter && !enter.hidden ? enter : document.getElementById('main');
    back?.focus({ preventScroll: true });
  };

  const fail = (error: unknown) => {
    console.error('[room] could not start the 3D room; showing the simple page.', error);
    // Unmount outside React's own error handling.
    setTimeout(stop, 0);
  };

  const start = async () => {
    if (unmount || starting) return;
    starting = true;
    const current = session;
    html.dataset.room = 'boot';
    root.hidden = false;
    showProgress(null);
    preloadModels();
    setPageInert(true);
    root.focus({ preventScroll: true });
    cancelLoadTimer = startVisibleTimer(() => {
      fail(new Error(`room not ready after ${LOAD_TIMEOUT_MS} ms`));
    }, LOAD_TIMEOUT_MS);
    try {
      const { mountRoom } = await import('./mount');
      // The visitor left, or the load timed out, while the bundle was downloading.
      if (current !== session) return;
      unmount = mountRoom(app, {
        lang: html.lang,
        coarse: !matchMedia('(pointer: fine)').matches,
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        onReady: () => {
          cancelLoadTimer?.();
          html.dataset.room = 'open';
          root.dataset.state = 'ready';
        },
        onProgress: (fraction) => {
          if (current === session) showProgress(fraction);
        },
        onFail: fail,
      });
    } catch (error) {
      fail(error);
    } finally {
      // A cancelled start must not clear the flag of a newer one.
      if (current === session) starting = false;
    }
  };

  exit.addEventListener('click', () => {
    save('simple');
    stop();
  });

  // The inline gate only probes WebGL when it may auto-start; probe here for the button.
  const autoStart = html.dataset.room === 'boot';
  if (enter && (autoStart || hasWebGL())) {
    enter.hidden = false;
    enter.addEventListener('click', () => {
      save('room');
      void start();
    });
  }

  if (autoStart) void start();
}
