import { BOOT_CLAIM_KEY, LOAD_TIMEOUT_MS, MODE_KEY, type SavedMode } from '../lib/mode';

/**
 * Runtime half of the gate (the decision itself runs inline in <head>, see GATE_SCRIPT).
 * Shows the "View the 3D room" button when WebGL works, opens the room when the gate said
 * so or the visitor asked, and closes it back to the simple page. The room bundle
 * (React, three, R3F, drei, GSAP) is only fetched by start().
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

export function initRoomGate(): void {
  const root = document.getElementById('room-root');
  const app = root?.querySelector<HTMLElement>('[data-room-app]');
  const exit = root?.querySelector<HTMLButtonElement>('[data-room-exit]');
  const enter = document.getElementById('room-enter') as HTMLButtonElement | null;
  if (!root || !app || !exit) return;
  // Tell the inline gate's fallback timer that the loading screen is in good hands.
  html.dataset[BOOT_CLAIM_KEY] = '1';

  let unmount: (() => void) | null = null;
  let starting = false;
  // Bumped on every stop(), so a start() still loading knows it was cancelled.
  let session = 0;
  let loadTimer: ReturnType<typeof setTimeout> | undefined;

  const setPageInert = (on: boolean) => {
    for (const el of Array.from(document.body.children)) {
      if (el !== root) el.toggleAttribute('inert', on);
    }
  };

  const stop = () => {
    session += 1;
    starting = false;
    clearTimeout(loadTimer);
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
    setPageInert(true);
    root.focus({ preventScroll: true });
    loadTimer = setTimeout(() => {
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
          clearTimeout(loadTimer);
          html.dataset.room = 'open';
          root.dataset.state = 'ready';
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
