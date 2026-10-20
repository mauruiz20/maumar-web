/** What startVisibleTimer needs from the browser; injectable so tests can drive it. */
export interface VisibleTimerEnv {
  now: () => number;
  isHidden: () => boolean;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (id: unknown) => void;
  /** Subscribes to visibility changes; returns the unsubscribe function. */
  onVisibilityChange: (fn: () => void) => () => void;
}

export const browserTimerEnv = (): VisibleTimerEnv => ({
  now: () => performance.now(),
  isHidden: () => document.visibilityState === 'hidden',
  setTimeout: (fn, ms) => window.setTimeout(fn, ms),
  clearTimeout: (id) => window.clearTimeout(id as number),
  onVisibilityChange: (fn) => {
    document.addEventListener('visibilitychange', fn);
    return () => document.removeEventListener('visibilitychange', fn);
  },
});

/**
 * Like setTimeout, but only time the page spends visible counts towards `ms`. Browsers do not
 * paint hidden tabs, so a deadline that waits for a rendered frame must not run out while the
 * visitor has the page in a background tab. Returns a cancel function.
 */
export function startVisibleTimer(fn: () => void, ms: number, env: VisibleTimerEnv = browserTimerEnv()): () => void {
  let remaining = ms;
  let startedAt = 0;
  let timer: unknown = null;
  let done = false;

  const run = () => {
    if (done || timer !== null || env.isHidden()) return;
    startedAt = env.now();
    timer = env.setTimeout(() => {
      timer = null;
      finish();
      fn();
    }, remaining);
  };

  const pause = () => {
    if (timer === null) return;
    env.clearTimeout(timer);
    timer = null;
    remaining = Math.max(0, remaining - (env.now() - startedAt));
  };

  const unsubscribe = env.onVisibilityChange(() => (env.isHidden() ? pause() : run()));

  const finish = () => {
    done = true;
    unsubscribe();
  };

  run();
  return () => {
    if (done) return;
    pause();
    finish();
  };
}
