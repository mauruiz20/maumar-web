import { Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createTweens, power2InOut, tween } from '../src/room/tween';

/** GSAP's power2.inOut (its "Cubic" ease): p < .5 ? (2p)^3 / 2 : 1 - (2(1 - p))^3 / 2. */
const gsapPower2InOut = (p: number) => (p < 0.5 ? Math.pow(p * 2, 3) / 2 : 1 - Math.pow((1 - p) * 2, 3) / 2);

describe('power2InOut', () => {
  it('starts at 0, ends at 1 and passes 0.5 half-way', () => {
    expect(power2InOut(0)).toBe(0);
    expect(power2InOut(1)).toBe(1);
    expect(power2InOut(0.5)).toBeCloseTo(0.5, 12);
  });

  it('is symmetric about the middle', () => {
    for (const t of [0.05, 0.2, 0.33, 0.45]) expect(power2InOut(t) + power2InOut(1 - t)).toBeCloseTo(1, 12);
  });

  it("matches GSAP's power2.inOut", () => {
    for (let i = 0; i <= 40; i++) expect(power2InOut(i / 40)).toBeCloseTo(gsapPower2InOut(i / 40), 12);
  });
});

describe('tween', () => {
  it('reaches the target exactly at its duration, easing on the way', () => {
    const o = { x: 0, y: 10 };
    const t = tween(o, { x: 1, y: 0 }, { duration: 1 });
    const xs: number[] = [];
    for (let i = 0; i < 10; i++) {
      t.step(0.1);
      xs.push(o.x);
    }
    expect(o).toEqual({ x: 1, y: 0 });
    expect(t.done).toBe(true);
    // Monotonic for a monotonic ease, and eased (slow start).
    for (let i = 1; i < xs.length; i++) expect(xs[i]!).toBeGreaterThanOrEqual(xs[i - 1]!);
    expect(xs[0]).toBeCloseTo(power2InOut(0.1), 10);
  });

  it('tweens a Vector3 in place', () => {
    const v = new Vector3(0, 0, 0);
    const t = tween(v, { x: 3, y: -3, z: 1 }, { duration: 0.5 });
    t.step(0.25);
    expect(v.x).toBeCloseTo(1.5);
    t.step(0.25);
    expect(v.toArray()).toEqual([3, -3, 1]);
  });

  it('calls onUpdate on every step and onComplete once at the end', () => {
    const onUpdate = vi.fn();
    const onComplete = vi.fn();
    const t = tween({ x: 0 }, { x: 1 }, { duration: 0.3, onUpdate, onComplete });
    t.step(0.1);
    t.step(0.1);
    t.step(0.1);
    t.step(0.1);
    expect(onUpdate).toHaveBeenCalledTimes(3);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('retargets from the current value: a new tween after cancel starts where the old one was', () => {
    const o = { x: 0 };
    const first = tween(o, { x: 10 }, { duration: 1 });
    first.step(0.5);
    const mid = o.x;
    first.cancel();
    const second = tween(o, { x: 0 }, { duration: 1 });
    second.step(0.0001);
    expect(o.x).toBeCloseTo(mid, 3);
    second.step(1);
    expect(o.x).toBe(0);
  });

  it('stops updating once cancelled', () => {
    const o = { x: 0 };
    const onComplete = vi.fn();
    const t = tween(o, { x: 1 }, { duration: 1, onComplete });
    t.step(0.2);
    const at = o.x;
    t.cancel();
    t.step(5);
    expect(o.x).toBe(at);
    expect(onComplete).not.toHaveBeenCalled();
    expect(t.done).toBe(true);
  });

  it('is instant with a zero or negative duration', () => {
    for (const duration of [0, -1]) {
      const o = { x: 0 };
      const onComplete = vi.fn();
      const t = tween(o, { x: 2 }, { duration, onComplete });
      expect(o.x).toBe(2);
      expect(t.done).toBe(true);
      expect(onComplete).toHaveBeenCalledTimes(1);
    }
  });

  it('clamps a long frame (a 1 s hitch) to the end, without overshoot', () => {
    const o = { x: 0 };
    const t = tween(o, { x: 1 }, { duration: 0.4 });
    t.step(1);
    expect(o.x).toBe(1);
    t.step(1);
    expect(o.x).toBe(1);
  });

  it('ignores negative frame deltas', () => {
    const o = { x: 0 };
    const t = tween(o, { x: 1 }, { duration: 1 });
    t.step(0.5);
    const at = o.x;
    t.step(-0.3);
    expect(o.x).toBe(at);
  });
});

describe('createTweens', () => {
  it('steps every running tween from one frame loop and drops finished ones', () => {
    const tweens = createTweens();
    const a = { x: 0 };
    const b = { y: 0 };
    tweens.add(tween(a, { x: 1 }, { duration: 0.2 }));
    tweens.add(tween(b, { y: 1 }, { duration: 1 }));
    tweens.step(0.5);
    expect(a.x).toBe(1);
    expect(b.y).toBeCloseTo(power2InOut(0.5));
    expect(tweens.size).toBe(1);
    tweens.step(0.5);
    expect(b.y).toBe(1);
    expect(tweens.size).toBe(0);
  });

  it('drops a cancelled tween', () => {
    const tweens = createTweens();
    const t = tweens.add(tween({ x: 0 }, { x: 1 }, { duration: 1 }));
    t.cancel();
    tweens.step(0.1);
    expect(tweens.size).toBe(0);
  });
});
