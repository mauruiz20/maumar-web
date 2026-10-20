import { describe, expect, it } from 'vitest';
import { startVisibleTimer, type VisibleTimerEnv } from '../src/lib/visibleTimer';

/** A fake clock, page visibility and setTimeout, driven by the test. */
function fakeEnv(hidden = false) {
  let now = 0;
  let isHidden = hidden;
  let nextId = 1;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const listeners = new Set<() => void>();
  const env: VisibleTimerEnv = {
    now: () => now,
    isHidden: () => isHidden,
    setTimeout: (fn, ms) => {
      const id = nextId++;
      timers.set(id, { at: now + ms, fn });
      return id;
    },
    clearTimeout: (id) => {
      timers.delete(id as number);
    },
    onVisibilityChange: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
  const advance = (ms: number) => {
    const end = now + ms;
    for (;;) {
      const due = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      timers.delete(due[0]);
      now = due[1].at;
      due[1].fn();
    }
    now = end;
  };
  const setHidden = (value: boolean) => {
    isHidden = value;
    for (const fn of listeners) fn();
  };
  return { env, advance, setHidden, listeners };
}

describe('startVisibleTimer', () => {
  it('fires after the delay when the page stays visible', () => {
    const { env, advance } = fakeEnv();
    let fired = 0;
    startVisibleTimer(() => fired++, 1000, env);
    advance(999);
    expect(fired).toBe(0);
    advance(1);
    expect(fired).toBe(1);
  });

  it('does not count time while the page is hidden', () => {
    const { env, advance, setHidden } = fakeEnv();
    let fired = 0;
    startVisibleTimer(() => fired++, 1000, env);
    advance(600);
    setHidden(true);
    advance(60_000);
    expect(fired).toBe(0);
    setHidden(false);
    advance(399);
    expect(fired).toBe(0);
    advance(1);
    expect(fired).toBe(1);
  });

  it('starts counting only once a page opened in the background becomes visible', () => {
    const { env, advance, setHidden } = fakeEnv(true);
    let fired = 0;
    startVisibleTimer(() => fired++, 1000, env);
    advance(30_000);
    expect(fired).toBe(0);
    setHidden(false);
    advance(1000);
    expect(fired).toBe(1);
  });

  it('never fires after it is cancelled, and stops listening', () => {
    const { env, advance, setHidden, listeners } = fakeEnv();
    let fired = 0;
    const cancel = startVisibleTimer(() => fired++, 1000, env);
    advance(500);
    cancel();
    setHidden(true);
    setHidden(false);
    advance(5000);
    expect(fired).toBe(0);
    expect(listeners.size).toBe(0);
  });

  it('fires once and stops listening', () => {
    const { env, advance, setHidden, listeners } = fakeEnv();
    let fired = 0;
    startVisibleTimer(() => fired++, 1000, env);
    advance(1000);
    setHidden(true);
    setHidden(false);
    advance(5000);
    expect(fired).toBe(1);
    expect(listeners.size).toBe(0);
  });
});
