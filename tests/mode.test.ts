import { describe, expect, it } from 'vitest';
import {
  BOOT_CLAIM_KEY,
  BOOT_TIMEOUT_MS,
  GATE_SCRIPT,
  LOAD_TIMEOUT_MS,
  MIN_DEVICE_MEMORY_GB,
  MODE_KEY,
  parseSavedMode,
  shouldAutoStartRoom,
  type GateEnv,
} from '../src/lib/mode';

const anyDevice: GateEnv = { webgl: true, saved: null, saveData: false, deviceMemory: undefined };

describe('shouldAutoStartRoom', () => {
  it('starts by default on any device with WebGL, phones included', () => {
    expect(shouldAutoStartRoom(anyDevice)).toBe(true);
    expect(shouldAutoStartRoom({ ...anyDevice, deviceMemory: 8 })).toBe(true);
  });

  it('starts when the visitor saved "room"', () => {
    expect(shouldAutoStartRoom({ ...anyDevice, saved: 'room' })).toBe(true);
  });

  it('never starts when the visitor chose simple mode', () => {
    expect(shouldAutoStartRoom({ ...anyDevice, saved: 'simple' })).toBe(false);
  });

  it('does not start without WebGL', () => {
    expect(shouldAutoStartRoom({ ...anyDevice, webgl: false })).toBe(false);
  });

  it('does not start when the browser asks to save data', () => {
    expect(shouldAutoStartRoom({ ...anyDevice, saveData: true })).toBe(false);
  });

  it('does not start on devices that report less than 4 GB of memory', () => {
    expect(MIN_DEVICE_MEMORY_GB).toBe(4);
    expect(shouldAutoStartRoom({ ...anyDevice, deviceMemory: 2 })).toBe(false);
    expect(shouldAutoStartRoom({ ...anyDevice, deviceMemory: 4 })).toBe(true);
  });

  it('starts when the device does not report its memory (Safari, Firefox)', () => {
    expect(shouldAutoStartRoom({ ...anyDevice, deviceMemory: undefined })).toBe(true);
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

interface FakeOpts {
  storageThrows?: boolean;
  canvasThrows?: boolean;
  /** Browsers without the Network Information API have no navigator.connection. */
  noConnection?: boolean;
}

/** Runs the inline gate against a fake browser and reports what it decided. */
function runGate(env: GateEnv, opts: FakeOpts = {}): FakeRun {
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
  const navigator = {
    deviceMemory: env.deviceMemory,
    connection: opts.noConnection ? undefined : { saveData: env.saveData },
  };
  new Function('document', 'localStorage', 'navigator', 'setTimeout', GATE_SCRIPT)(
    document,
    localStorage,
    navigator,
    setTimeout,
  );
  return { room: dataset.room, webglChecked, dataset, timers };
}

describe('inline gate script', () => {
  const saved = [null, 'room', 'simple'] as const;
  const memory = [undefined, 1, 2, 4, 8];
  const cases: GateEnv[] = [true, false].flatMap((webgl) =>
    [true, false].flatMap((saveData) =>
      memory.flatMap((deviceMemory) => saved.map((s) => ({ webgl, saveData, deviceMemory, saved: s }))),
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
    expect(runGate({ ...anyDevice, saved: 'simple' }).webglChecked).toBe(false);
    expect(runGate({ ...anyDevice, saveData: true }).webglChecked).toBe(false);
    expect(runGate({ ...anyDevice, deviceMemory: 2 }).webglChecked).toBe(false);
  });

  it('works in browsers without navigator.connection', () => {
    expect(runGate(anyDevice, { noConnection: true }).room).toBe('boot');
  });

  it('falls back to the simple page when storage or canvas throws', () => {
    expect(runGate(anyDevice, { storageThrows: true }).room).toBe('boot');
    expect(runGate(anyDevice, { canvasThrows: true }).room).toBeUndefined();
  });

  it('uncovers the page if the boot script never claims the loading screen', () => {
    const run = runGate(anyDevice);
    expect(run.timers).toHaveLength(1);
    expect(run.timers[0].ms).toBe(BOOT_TIMEOUT_MS);
    run.timers[0].fn();
    expect(run.dataset.room).toBeUndefined();
  });

  it('leaves the loading screen alone once the boot script has claimed it', () => {
    const run = runGate(anyDevice);
    run.dataset[BOOT_CLAIM_KEY] = '1';
    run.timers[0].fn();
    expect(run.dataset.room).toBe('boot');
  });

  it('schedules no fallback when the room does not auto-start', () => {
    expect(runGate({ ...anyDevice, saved: 'simple' }).timers).toHaveLength(0);
  });
});

describe('timeouts', () => {
  it('gives the room bundle longer than the boot script', () => {
    expect(BOOT_TIMEOUT_MS).toBeGreaterThanOrEqual(3000);
    expect(LOAD_TIMEOUT_MS).toBeGreaterThan(BOOT_TIMEOUT_MS);
  });
});
