// Renders public/og/{en,es}.png (1200x630) from an SVG with sharp.
// Display text is converted to outlines with opentype.js from the same Young Serif
// file the site self-hosts, so the images match the site without installing fonts.
// Usage: npm run og
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fontBuffer = readFileSync(join(root, 'node_modules/@fontsource/young-serif/files/young-serif-latin-400-normal.woff'));
const display = opentype.parse(fontBuffer.buffer.slice(fontBuffer.byteOffset, fontBuffer.byteOffset + fontBuffer.byteLength));

const PAPER = '#f5f6f3';
const INK = '#1c2421';
const MUTED = '#5a6560';
const ACCENT = '#b4245f';

const pages = {
  en: { role: 'Computer Engineer and full-stack developer', place: 'San Miguel de Tucumán, Argentina' },
  es: { role: 'Ingeniero en Computación y desarrollador fullstack', place: 'San Miguel de Tucumán, Argentina' },
};

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * SVG path for `text` in Young Serif with its baseline at (x, y).
 * Laid out glyph by glyph with kerning, and serialized here: opentype.js 2.0's
 * toPathData() prints NaN for some valid coordinates in this font.
 */
const n = (v) => Number(v.toFixed(2));

function serialize(commands) {
  return commands
    .map((c) => {
      switch (c.type) {
        case 'M':
        case 'L':
          return `${c.type}${n(c.x)} ${n(c.y)}`;
        case 'Q':
          return `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
        case 'C':
          return `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
        default:
          return 'Z';
      }
    })
    .join('');
}

function outline(text, x, y, size, letterSpacing = 0) {
  const scale = size / display.unitsPerEm;
  const glyphs = [...text].map((c) => display.charToGlyph(c));
  let cursor = x;
  let d = '';
  glyphs.forEach((glyph, i) => {
    d += serialize(glyph.getPath(cursor, y, size).commands);
    const next = glyphs[i + 1];
    const kern = next ? display.getKerningValue(glyph, next) : 0;
    cursor += (glyph.advanceWidth + kern) * scale + letterSpacing * size;
  });
  return d;
}

function svg({ role, place }) {
  const name = [
    outline('Francisco', 88, 186, 112, -0.02),
    outline('Mauricio', 88, 294, 112, -0.02),
    outline('Ruiz', 88 + 112 * 1.6, 402, 112, -0.02),
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${PAPER}"/>
  <rect x="88" y="62" width="72" height="8" fill="${ACCENT}"/>
  <g fill="${INK}">${name.map((d) => `<path d="${d}"/>`).join('')}<path d="${outline(role, 88, 508, 38)}"/></g>
  <g font-family="Helvetica, Arial, sans-serif" font-size="28" fill="${MUTED}">
    <text x="88" y="566">${escape(place)}</text>
    <text x="1112" y="566" text-anchor="end">maumar.com.ar</text>
  </g>
</svg>`;
}

const outDir = join(root, 'public/og');
mkdirSync(outDir, { recursive: true });
for (const [lang, page] of Object.entries(pages)) {
  const out = join(outDir, `${lang}.png`);
  await sharp(Buffer.from(svg(page))).png({ compressionLevel: 9 }).toFile(out);
  console.log('wrote', out);
}
