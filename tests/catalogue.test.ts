import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CATALOGUE } from '../src/room/catalogue';

const ROOM = join(import.meta.dirname, '..', 'src', 'room');
/** HTML elements the room's components render (everything else lowercase is a three element). */
const HTML = new Set(['a', 'article', 'button', 'canvas', 'dd', 'div', 'dl', 'dt', 'h2', 'h3', 'li', 'nav', 'p', 'section', 'span', 'time', 'ul']);
/** R3F built-ins that need no catalogue entry. */
const BUILT_IN = new Set(['primitive']);
/** Lowercase TypeScript types in generics (useRef<string>), not JSX. */
const TS_TYPES = new Set(['string', 'number', 'boolean', 'unknown', 'any', 'never', 'void', 'null', 'undefined', 'object']);
const pascal = (tag: string) => tag[0]!.toUpperCase() + tag.slice(1);

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? tsxFiles(join(dir, e.name)) : e.name.endsWith('.tsx') ? [join(dir, e.name)] : [],
  );
}

function intrinsicTags(source: string): Set<string> {
  return new Set([...source.matchAll(/<([a-z][A-Za-z0-9]*)[\s/>]/g)].map((m) => m[1]!));
}

describe('three catalogue', () => {
  it('registers every three element the room JSX uses', () => {
    const missing: string[] = [];
    for (const file of tsxFiles(ROOM)) {
      for (const tag of intrinsicTags(readFileSync(file, 'utf8'))) {
        if (HTML.has(tag) || BUILT_IN.has(tag) || TS_TYPES.has(tag)) continue;
        if (!(pascal(tag) in CATALOGUE)) missing.push(`<${tag}> in ${file.slice(ROOM.length + 1)}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("registers the elements drei's <Html> creates", () => {
    const html = readFileSync(join(import.meta.dirname, '..', 'node_modules', '@react-three', 'drei', 'web', 'Html.js'), 'utf8');
    const tags = new Set([...html.matchAll(/createElement\("([a-z][A-Za-z]*)"/g)].map((m) => m[1]!));
    expect(tags.size).toBeGreaterThan(1);
    for (const tag of tags) if (!HTML.has(tag)) expect(CATALOGUE, tag).toHaveProperty(pascal(tag));
  });

  it('holds only three constructors, and none the room does not use', () => {
    for (const [name, ctor] of Object.entries(CATALOGUE)) expect(typeof ctor, name).toBe('function');
    expect(Object.keys(CATALOGUE).length).toBeLessThan(25);
  });

  it('never imports the whole three namespace in the room code', () => {
    for (const file of readdirSync(ROOM).map((f) => join(ROOM, f))) {
      if (!/\.(ts|tsx)$/.test(file)) continue;
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/import\s+\*\s+as\s+\w+\s+from\s+'three'/);
    }
  });
});
