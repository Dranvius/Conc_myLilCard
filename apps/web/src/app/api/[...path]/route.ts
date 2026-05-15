/**
 * Catch-all proxy hacia el API backend.
 *
 * Rutas especificas (login, register) tienen su propio route.ts con mayor prioridad.
 * Este handler cubre todo lo demas: companies, contacts, opportunities, google oauth, etc.
 *
 * El cliente llama /api/<path> (mismo origen, sin CORS).
 * Este handler llama ${INTERNAL_API_URL}/api/<path> server-side.
 * Los Set-Cookie del upstream se aplican con NextResponse.cookies.set()
 * para garantizar que el navegador los reciba correctamente.
 */
import { type NextRequest, NextResponse } from 'next/server';
import { getSetCookieHeaders, parseSetCookie } from '@/lib/set-cookie';

const API_URL = process.env.INTERNAL_API_URL ?? 'http://localhost:4000';

const SKIP_REQ = new Set([
  'connection',
  'keep-alive',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
]);

const SKIP_RES = new Set([
  'connection',
  'keep-alive',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'content-encoding',
  'content-length',
]);

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const upstream = `${API_URL}/api/${path.join('/')}${request.nextUrl.search}`;

  const forwardHeaders = new Headers();
  request.headers.forEach((value, key) => {
    if (!SKIP_REQ.has(key.toLowerCase())) {
      forwardHeaders.set(key, value);
    }
  });

  let body: ArrayBuffer | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.arrayBuffer();
  }

  const upstreamRes = await fetch(upstream, {
    method: request.method,
    headers: forwardHeaders,
    body,
    redirect: 'manual',
  });

  const setCookies = getSetCookieHeaders(upstreamRes.headers);

  const responseHeaders = new Headers();
  upstreamRes.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (!SKIP_RES.has(lower) && lower !== 'set-cookie') {
      responseHeaders.append(key, value);
    }
  });

  if (upstreamRes.status >= 300 && upstreamRes.status < 400) {
    const location = upstreamRes.headers.get('location') ?? '/';
    const redirectRes = NextResponse.redirect(location, {
      status: upstreamRes.status,
    });

    responseHeaders.forEach((value, key) => {
      redirectRes.headers.append(key, value);
    });

    for (const cookieStr of setCookies) {
      const { name, value, options } = parseSetCookie(cookieStr);
      redirectRes.cookies.set(
        name,
        value,
        options as Parameters<typeof redirectRes.cookies.set>[2],
      );
    }

    return redirectRes;
  }

  const response = new NextResponse(upstreamRes.body, {
    status: upstreamRes.status,
    statusText: upstreamRes.statusText,
    headers: responseHeaders,
  });

  for (const cookieStr of setCookies) {
    const { name, value, options } = parseSetCookie(cookieStr);
    response.cookies.set(
      name,
      value,
      options as Parameters<typeof response.cookies.set>[2],
    );
  }

  return response;
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
