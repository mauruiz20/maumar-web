/**
 * A tiny tween helper for the camera moves (replaces GSAP, ~30 KB gzip, for the three things
 * the room animates: camera position, look-at target and panel offset). Tweens are stepped
 * by R3F's frame loop (useFrame delta), not by their own requestAnimationFrame. Like
 * `gsap.to`, a tween reads its start values when it is created, so retargeting is "cancel the
 * running one, start a new one from wherever the value is now".
 */

/** GSAP's power2.inOut (a cubic in-out). */
export function power2InOut(t: number): number {
  return t < 0.5 ? Math.pow(t * 2, 3) / 2 : 1 - Math.pow((1 - t) * 2, 3) / 2;
}

export interface TweenOptions {
  /** Seconds; zero or less applies the end values at once. */
  duration: number;
  ease?: (t: number) => number;
  onUpdate?: () => void;
  onComplete?: () => void;
}

export interface Tween {
  readonly done: boolean;
  /** Advances by dt seconds (negative is ignored; a long frame clamps to the end). */
  step(dt: number): void;
  /** Stops where it is: no more updates, no onComplete. */
  cancel(): void;
}

type Numeric<T> = { [K in keyof T]?: T[K] extends number ? number : never };

export function tween<T extends object>(target: T, to: Numeric<T>, opts: TweenOptions): Tween {
  const { duration, ease = power2InOut, onUpdate, onComplete } = opts;
  const record = target as Record<string, number>;
  const keys = Object.keys(to) as string[];
  const from = keys.map((k) => record[k]!);
  const end = keys.map((k) => (to as Record<string, number>)[k]!);
  let elapsed = 0;
  let done = false;

  const apply = (p: number) => {
    keys.forEach((k, i) => {
      record[k] = p >= 1 ? end[i]! : from[i]! + (end[i]! - from[i]!) * p;
    });
  };

  const finish = () => {
    apply(1);
    done = true;
    onUpdate?.();
    onComplete?.();
  };

  if (!(duration > 0)) finish();

  return {
    get done() {
      return done;
    },
    step(dt) {
      if (done || !(dt > 0)) return;
      elapsed = Math.min(duration, elapsed + dt);
      // A microsecond of slack, so frame deltas summing to the duration land on it exactly.
      if (elapsed >= duration - 1e-6) {
        finish();
        return;
      }
      apply(ease(elapsed / duration));
      onUpdate?.();
    },
    cancel() {
      done = true;
    },
  };
}

/** The running tweens of one frame loop: add them, step them all once per frame. */
export function createTweens() {
  const running = new Set<Tween>();
  return {
    add<T extends Tween>(t: T): T {
      if (!t.done) running.add(t);
      return t;
    },
    step(dt: number) {
      for (const t of running) {
        t.step(dt);
        if (t.done) running.delete(t);
      }
    },
    get size() {
      for (const t of running) if (t.done) running.delete(t);
      return running.size;
    },
  };
}
