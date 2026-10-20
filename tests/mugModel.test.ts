import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { hotspotById } from '../src/room/hotspots';
import { MUG, MUG_DECAL, mugDecalGeometry } from '../src/room/mugModel';
import { PALETTE } from '../src/room/palette';

const SVG = readFileSync(join(import.meta.dirname, '..', 'src', 'room', 'mugIcon.svg'), 'utf8');

/** A small well-formedness check: every tag closes in order, attributes are quoted. */
function wellFormed(xml: string): string[] {
  const errors: string[] = [];
  const stack: string[] = [];
  const body = xml.replace(/<\?xml[^>]*\?>/, '').replace(/<!--[\s\S]*?-->/g, '');
  for (const m of body.matchAll(/<(\/?)([A-Za-z][\w:-]*)([^>]*?)(\/?)>/g)) {
    const [, closing, name, attrs, selfClosing] = m;
    const stripped = attrs!.replace(/\s[\w:-]+="[^"]*"/g, '').trim();
    if (stripped) errors.push(`<${name}> has unquoted or malformed attributes: ${stripped}`);
    if (closing) {
      if (stack.pop() !== name) errors.push(`unexpected </${name}>`);
    } else if (!selfClosing) stack.push(name!);
  }
  if (stack.length) errors.push(`unclosed: ${stack.join(', ')}`);
  if (body.replace(/<[^>]*>/g, '').trim()) errors.push('text content outside tags');
  return errors;
}

describe('the mug icon SVG', () => {
  it('is well-formed, with a single <svg> root and a viewBox', () => {
    expect(wellFormed(SVG)).toEqual([]);
    expect(SVG.trim()).toMatch(/^<svg\b[^>]*\bviewBox="0 0 \d+ \d+"[^>]*>[\s\S]*<\/svg>$/);
    expect(SVG).toMatch(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  });

  it('has no text, images, scripts, styles or external references', () => {
    for (const tag of ['text', 'image', 'script', 'style', 'foreignObject', 'use', 'a']) {
      expect(SVG, tag).not.toMatch(new RegExp(`<${tag}[\\s>/]`));
    }
    expect(SVG).not.toMatch(/href|url\(|@import|javascript:|on[a-z]+=/i);
  });

  it('uses only site palette colours', () => {
    const palette = new Set(Object.values(PALETTE).map((c) => c.toLowerCase()));
    const colours = [...SVG.matchAll(/(?:fill|stroke)="([^"]+)"/g)].map((m) => m[1]!.toLowerCase());
    expect(colours.length).toBeGreaterThan(5);
    for (const c of colours) if (c !== 'none') expect(palette, c).toContain(c);
    expect(SVG).not.toMatch(/gradient|filter|opacity/i);
  });
});

describe('the mug decal', () => {
  it('wraps the mug just outside its body (0.5–2 mm)', () => {
    const gap = MUG_DECAL.radius - MUG.radius;
    expect(gap).toBeGreaterThanOrEqual(0.0005);
    expect(gap).toBeLessThanOrEqual(0.002);
  });

  it('faces the mug close-up cameras, landscape and portrait, within 30°', () => {
    const mug = hotspotById('mug');
    for (const v of [mug.view, mug.portraitView!]) {
      const toCamera = Math.atan2(v.position[0] - v.target[0], v.position[2] - v.target[2]);
      const diff = Math.atan2(Math.sin(toCamera - MUG_DECAL.thetaCenter), Math.cos(toCamera - MUG_DECAL.thetaCenter));
      expect(Math.abs(diff)).toBeLessThan(Math.PI / 6);
    }
  });

  it('stays clear of the handle (+x, at 90°) and between the base and the accent band', () => {
    const edge = MUG_DECAL.thetaCenter + MUG_DECAL.thetaLength / 2;
    const handleHalf = Math.atan2(MUG.handle.width / 2, MUG.radius);
    expect(edge).toBeLessThan(Math.PI / 2 - handleHalf);
    const bottom = MUG_DECAL.centerY - MUG_DECAL.height / 2;
    const top = MUG_DECAL.centerY + MUG_DECAL.height / 2;
    expect(bottom).toBeGreaterThan(-MUG.height / 2);
    expect(top).toBeLessThan(MUG.band.y - MUG.band.height / 2);
    // About 3 cm tall, readable from the close-up.
    expect(MUG_DECAL.height).toBeGreaterThan(0.025);
  });

  it('builds an open cylinder segment with the decal footprint', () => {
    const g = mugDecalGeometry();
    g.computeBoundingBox();
    const b = g.boundingBox!;
    expect(b.max.y - b.min.y).toBeCloseTo(MUG_DECAL.height, 6);
    expect((b.max.y + b.min.y) / 2).toBeCloseTo(MUG_DECAL.centerY, 6);
    const pos = g.getAttribute('position');
    for (let i = 0; i < pos.count; i++) expect(Math.hypot(pos.getX(i), pos.getZ(i))).toBeCloseTo(MUG_DECAL.radius, 6);
    expect(g.index!.count / 3).toBeLessThan(200);
  });

  it('matches the canvas aspect to the decal, so the icon is not stretched', () => {
    const [w, h] = MUG_DECAL.canvas;
    const arc = MUG_DECAL.radius * MUG_DECAL.thetaLength;
    expect(w / h).toBeCloseTo(arc / MUG_DECAL.height, 1);
    const [, , vw, vh] = SVG.match(/viewBox="(\d+) (\d+) (\d+) (\d+)"/)!.slice(1).map(Number);
    expect(vw! / vh!).toBeCloseTo(w / h, 1);
  });
});
