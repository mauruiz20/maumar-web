import { describe, expect, it } from 'vitest';
import { preferredLang } from '../src/lib/lang';

describe('preferredLang', () => {
  it('picks Spanish when a regional Spanish tag comes first', () => {
    expect(preferredLang('es-AR,es;q=0.9,en;q=0.8', null)).toBe('es');
  });

  it('picks English when English outranks Spanish', () => {
    expect(preferredLang('en-US,es;q=0.8', null)).toBe('en');
  });

  it('honours q-values over order', () => {
    expect(preferredLang('es;q=0.9,en;q=0.8', null)).toBe('es');
    expect(preferredLang('es;q=0.5,en-GB;q=0.9', null)).toBe('en');
  });

  it('understands es-419', () => {
    expect(preferredLang('es-419', null)).toBe('es');
  });

  it('defaults to English without a header', () => {
    expect(preferredLang(null, null)).toBe('en');
    expect(preferredLang('', null)).toBe('en');
  });

  it('defaults to English on garbage', () => {
    expect(preferredLang('%%%;;q=abc,,', null)).toBe('en');
    expect(preferredLang('*', null)).toBe('en');
  });

  it('ignores languages it does not serve', () => {
    expect(preferredLang('fr-FR,fr;q=0.9', null)).toBe('en');
    expect(preferredLang('fr-FR,es;q=0.5', null)).toBe('es');
  });

  it('ignores Spanish with q=0', () => {
    expect(preferredLang('es;q=0', null)).toBe('en');
  });

  it('lets the cookie override the header', () => {
    expect(preferredLang('en-US', 'es')).toBe('es');
    expect(preferredLang('es-AR', 'en')).toBe('en');
  });

  it('ignores an invalid cookie', () => {
    expect(preferredLang('es-AR', 'fr')).toBe('es');
    expect(preferredLang('en-US', 'garbage')).toBe('en');
    expect(preferredLang(null, '')).toBe('en');
  });
});
