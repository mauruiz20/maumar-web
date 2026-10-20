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
  /** The Raspberry Pi's case and ports (piModel.ts). */
  piShell: '#25292b',
  piBase: '#171a1b',
  piFin: '#3a3f42',
  piScrew: '#4a5054',
  aluminium: '#c3c9cc',
  usbBlue: '#3a6fc4',
  cableYellow: '#e3c34a',
} as const;

export type PaletteKey = keyof typeof PALETTE;

/** Default palette key per Kenney material name. */
const MATERIALS: Record<string, PaletteKey> = {
  wood: 'wood',
  woodDark: 'wood',
  metal: 'muted',
  metalMedium: 'muted',
  metalDark: 'ink',
  carpet: 'rug',
  carpetDarker: 'accent',
  carpetWhite: 'paper',
  plant: 'leaf',
  lamp: 'paper',
};

/** Per-model exceptions (e.g. the monitor's light "metal" is its screen, which reads as off). */
const OVERRIDES: Record<string, Record<string, PaletteKey>> = {
  desk: { metal: 'ink' },
  bookcaseOpen: { wood: 'woodLight' },
  // Filler books stay quiet, so the three clickable project books stand out.
  books: { carpetDarker: 'inkSoft', plant: 'muted', metal: 'rule' },
  chairDesk: { carpet: 'inkSoft', metalMedium: 'ink' },
  computerScreen: { metal: 'inkSoft', metalDark: 'ink' },
  computerKeyboard: { metalMedium: 'muted' },
  lampRoundTable: { lamp: 'accent', metal: 'muted' },
  pottedPlant: { wood: 'accent', woodDark: 'wood' },
  rugRectangle: { carpet: 'rug', carpetDarker: 'accentSoft' },
};

/** Palette key for a Kenney material, optionally per model; unknown names fall back to muted. */
export function paletteFor(material: string, model?: string): PaletteKey {
  // Own keys only: names like "constructor" must not reach Object.prototype.
  const own = <T,>(map: Record<string, T> | undefined, key: string): T | undefined =>
    map && Object.hasOwn(map, key) ? map[key] : undefined;
  return (model ? own(own(OVERRIDES, model), material) : undefined) ?? own(MATERIALS, material) ?? 'muted';
}
