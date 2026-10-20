/**
 * Relays model loading progress (three's loading manager reports items loaded / total) from
 * the React tree to the loading screen, which lives outside React. The value never goes
 * backwards, even when the total grows mid-load, and a late listener gets the last value.
 */
export interface ProgressRelay {
  report: (loaded: number, total: number) => void;
  subscribe: (listener: (fraction: number) => void) => () => void;
}

export function createProgressRelay(): ProgressRelay {
  let last: number | null = null;
  const listeners = new Set<(fraction: number) => void>();
  return {
    report(loaded, total) {
      if (!(total > 0)) return;
      const fraction = Math.min(1, Math.max(0, loaded / total));
      if (last !== null && fraction <= last) return;
      last = fraction;
      for (const l of listeners) l(fraction);
    },
    subscribe(listener) {
      listeners.add(listener);
      if (last !== null) listener(last);
      return () => listeners.delete(listener);
    },
  };
}
