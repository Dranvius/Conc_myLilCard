/**
 * Ruta dedicada de registro que hace proxy al API y setea cookies
 * usando la API nativa de NextResponse.cookies.set().
 */
import { type NextRequest, NextResponse } from 'next/server';
import { getSetCookieHeaders, parseSetCookie } from '@/lib/set-cookie';

const API_URL = process.env.INTERNAL_API_URL ?? 'http://localhost:4000';

export async function POST(request: NextRequest) {
  const body = await request.text();

  const apiRes = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  const data = await apiRes.json().catch(() => ({}));

  if (!apiRes.ok) {
    return NextResponse.json(data, { status: apiRes.status });
  }

  const response = NextResponse.json(data);
  const setCookies = getSetCookieHeaders(apiRes.headers);

  for (const cookieStr of setCookies) {
    const { name, value, options } = parseSetCookie(cookieStr);
    response.cookies.set(name, value, options as any);
  }

  return response;
}
