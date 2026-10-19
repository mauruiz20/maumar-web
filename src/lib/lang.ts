export type Lang = 'en' | 'es';

export const LANGS: readonly Lang[] = ['en', 'es'];
export const DEFAULT_LANG: Lang = 'en';

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LANGS as readonly string[]).includes(value);
}

/** Highest q-value among Accept-Language entries whose primary tag is `lang`; 0 when absent. */
function weightFor(acceptLanguage: string, lang: Lang): number {
  let best = 0;
  for (const part of acceptLanguage.split(',')) {
    const [tag = '', ...params] = part.trim().split(';');
    const primary = tag.trim().toLowerCase().split('-')[0];
    if (primary !== lang) continue;
    let q = 1;
    for (const param of params) {
      const [key, value] = param.trim().split('=');
      if (key?.trim().toLowerCase() === 'q') {
        q = Number(value);
        if (!Number.isFinite(q) || q < 0 || q > 1) q = 0;
      }
    }
    best = Math.max(best, q);
  }
  return best;
}

/**
 * Language to serve on "/". A valid `lang` cookie (a manual choice) always wins;
 * otherwise Spanish only when the browser ranks it strictly above English.
 * Anything missing or unparsable falls back to English, so crawlers get "/".
 */
export function preferredLang(acceptLanguage: string | null, cookieLang: string | null): Lang {
  if (isLang(cookieLang)) return cookieLang;
  if (!acceptLanguage) return DEFAULT_LANG;
  const es = weightFor(acceptLanguage, 'es');
  const en = weightFor(acceptLanguage, 'en');
  return es > 0 && es > en ? 'es' : DEFAULT_LANG;
}

/** Value of the `lang` cookie from a Cookie header, or null. */
export function langCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const pair of cookieHeader.split(';')) {
    const [name, ...rest] = pair.trim().split('=');
    if (name === 'lang') return rest.join('=').trim();
  }
  return null;
}
