// Cloudflare Pages Function for "/" only. "/es/" and every asset stay static.
import { langCookie, preferredLang } from '../src/lib/lang';

interface Context {
  request: Request;
  next: () => Promise<Response>;
}

const VARY = 'Accept-Language, Cookie';

export async function onRequest(context: Context): Promise<Response> {
  const { request } = context;
  const lang = preferredLang(
    request.headers.get('Accept-Language'),
    langCookie(request.headers.get('Cookie')),
  );

  if (lang === 'es') {
    return new Response(null, {
      status: 302,
      headers: { Location: '/es/', Vary: VARY, 'Cache-Control': 'private, no-store' },
    });
  }

  const upstream = await context.next();
  const response = new Response(upstream.body, upstream);
  response.headers.set('Vary', VARY);
  return response;
}
