import { describe, expect, it } from 'vitest';
import {
  BOOT_CLAIM_KEY,
  BOOT_TIMEOUT_MS,
  FINE_POINTER_QUERY,
  LOAD_TIMEOUT_MS,
  GATE_SCRIPT,
  MODE_KEY,
  ROOM_MIN_WIDTH,
  parseSavedMode,
  shouldAutoStartRoom,
  type GateEnv,
} from '../src/lib/mode';

const desktop: GateEnv = { width: 1440, finePointer: true, webgl: true, saved: null };

describe('shouldAutoStartRoom', () => {
  it('starts on a desktop with a fine pointer, WebGL and no saved preference', () => {
    expect(shouldAutoStartRoom(desktop)).toBe(true);
  });

  it('starts on a desktop that saved "room"', () => {
    expect(shouldAutoStartRoom({ ...desktop, saved: 'room' })).toBe(true);
  });

  it('never starts when the visitor chose simple mode', () => {
    expect(shouldAutoStartRoom({ ...desktop, saved: 'simple' })).toBe(false);
  });

  it('does not auto-start on a phone even after it saved "room"', () => {
    expect(shouldAutoStartRoom({ width: 390, finePointer: false, webgl: true, saved: 'room' })).toBe(false);
  });

  it('does not start without WebGL', () => {
    expect(shouldAutoStartRoom({ ...desktop, webgl: false })).toBe(false);
  });

  it('needs at least 1024 px of width', () => {
    expect(ROOM_MIN_WIDTH).toBe(1024);
    expect(shouldAutoStartRoom({ ...desktop, width: 1023 })).toBe(false);
    expect(shouldAutoStartRoom({ ...desktop, width: 1024 })).toBe(true);
  });

  it('does not start with a coarse pointer on a wide screen', () => {
    expect(shouldAutoStartRoom({ ...desktop, finePointer: false })).toBe(false);
  });
});

describe('parseSavedMode', () => {
  it('accepts only the two known modes', () => {
    expect(parseSavedMode('room')).toBe('room');
    expect(parseSavedMode('simple')).toBe('simple');
    expect(parseSavedMode('ROOM')).toBeNull();
    expect(parseSavedMode(null)).toBeNull();
    expect(parseSavedMode(undefined)).toBeNull();
  });
});

interface FakeRun {
  room: string | undefined;
  webglChecked: boolean;
  dataset: Record<string, string>;
  timers: { fn: () => void; ms: number }[];
}

/** Runs the inline gate against a fake browser and reports what it decided. */
function runGate(env: GateEnv, opts: { storageThrows?: boolean; canvasThrows?: boolean } = {}): FakeRun {
  const dataset: Record<string, string> = {};
  const timers: FakeRun['timers'] = [];
  const setTimeout = (fn: () => void, ms: number) => {
    timers.push({ fn, ms });
  };
  let webglChecked = false;
  const document = {
    documentElement: { dataset },
    createElement: () => {
      webglChecked = true;
      if (opts.canvasThrows) throw new Error('no canvas');
      return { getContext: () => (env.webgl ? { getExtension: () => null } : null) };
    },
  };
  const localStorage = {
    getItem: (key: string) => {
      if (opts.storageThrows) throw new Error('blocked');
      return key === MODE_KEY ? env.saved : null;
    },
  };
  const matchMedia = (query: string) => ({ matches: query === FINE_POINTER_QUERY && env.finePointer });
  new Function('document', 'localStorage', 'innerWidth', 'matchMedia', 'setTimeout', GATE_SCRIPT)(
    document,
    localStorage,
    env.width,
    matchMedia,
    setTimeout,
  );
  return { room: dataset.room, webglChecked, dataset, timers };
}

describe('inline gate script', () => {
  const widths = [390, 1023, 1024, 1920];
  const saved = [null, 'room', 'simple'] as const;
  const cases: GateEnv[] = widths.flatMap((width) =>
    [true, false].flatMap((finePointer) =>
      [true, false].flatMap((webgl) => saved.map((s) => ({ width, finePointer, webgl, saved: s }))),
    ),
  );

  it.each(cases)('agrees with shouldAutoStartRoom for %o', (env) => {
    const { room } = runGate(env);
    expect(room === 'boot').toBe(shouldAutoStartRoom(env));
  });

  it('stays small', () => {
    expect(GATE_SCRIPT.length).toBeLessThan(1536);
  });

  it('skips the WebGL probe when the room cannot auto-start anyway', () => {
    expect(runGate({ width: 390, finePointer: false, webgl: true, saved: null }).webglChecked).toBe(false);
    expect(runGate({ ...desktop, saved: 'simple' }).webglChecked).toBe(false);
  });

  it('falls back to the simple page when storage or canvas throws', () => {
    expect(runGate(desktop, { storageThrows: true }).room).toBe('boot');
    expect(runGate(desktop, { canvasThrows: true }).room).toBeUndefined();
  });

  it('uncovers the page if the boot script never claims the loading screen', () => {
    const run = runGate(desktop);
    expect(run.timers).toHaveLength(1);
    expect(run.timers[0].ms).toBe(BOOT_TIMEOUT_MS);
    run.timers[0].fn();
    expect(run.dataset.room).toBeUndefined();
  });

  it('leaves the loading screen alone once the boot script has claimed it', () => {
    const run = runGate(desktop);
    run.dataset[BOOT_CLAIM_KEY] = '1';
    run.timers[0].fn();
    expect(run.dataset.room).toBe('boot');
  });

  it('schedules no fallback when the room does not auto-start', () => {
    expect(runGate({ ...desktop, saved: 'simple' }).timers).toHaveLength(0);
  });
});

describe('timeouts', () => {
  it('gives the room bundle longer than the boot script', () => {
    expect(BOOT_TIMEOUT_MS).toBeGreaterThanOrEqual(3000);
    expect(LOAD_TIMEOUT_MS).toBeGreaterThan(BOOT_TIMEOUT_MS);
  });
});
