import { describe, expect, it } from 'vitest';
import { onRequest } from '../functions/index';

function call(headers: Record<string, string>) {
  const request = new Request('https://maumar.com.ar/', { headers });
  const next = async () => new Response('<html>en</html>', { status: 200 });
  return onRequest({ request, next });
}

describe('Pages Function for /', () => {
  it('serves English to a crawler without Accept-Language', async () => {
    const res = await call({});
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('<html>en</html>');
    expect(res.headers.get('Vary')).toBe('Accept-Language, Cookie');
  });

  it('redirects a Spanish browser to /es/', async () => {
    const res = await call({ 'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8' });
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/es/');
    expect(res.headers.get('Vary')).toBe('Accept-Language, Cookie');
  });

  it('keeps an English choice made by cookie', async () => {
    const res = await call({ 'Accept-Language': 'es-AR', Cookie: 'theme=dark; lang=en' });
    expect(res.status).toBe(200);
  });

  it('redirects on a Spanish cookie', async () => {
    const res = await call({ 'Accept-Language': 'en-US', Cookie: 'lang=es' });
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/es/');
  });
});
