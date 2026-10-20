/**
 * Flat blockout colours, derived from the site tokens (paper, ink, muted, rule, lapacho
 * accent) plus a few woods. Models and baked light replace them in a later step.
 */
export const PALETTE = {
  floor: '#c8b59a',
  wallBack: '#ece9e1',
  wallLeft: '#e2e5df',
  wood: '#8a6a4f',
  woodLight: '#a8865f',
  ink: '#1c2421',
  inkSoft: '#2c3531',
  muted: '#5a6560',
  rule: '#d5d9d4',
  paper: '#f5f6f3',
  accent: '#b4245f',
  accentSoft: '#f28db7',
  /** Sky overhead, outside the window; the window glass tint. */
  sky: '#9cc4d8',
  glass: '#cfe6ef',
  leaf: '#4f7a5a',
  rug: '#c27a95',
  /** Hover highlight (emissive). */
  highlight: '#f28db7',
  lampLight: '#ffd9a8',
} as const;
