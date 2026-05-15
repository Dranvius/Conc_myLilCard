import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const publicPaths = ['/login', '/register', '/lead', '/health'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith('/api');

  // Las rutas /api del App Router funcionan como proxy hacia el backend y
  // no deben pasar por el guard de navegación del frontend.
  if (isApiRoute) {
    return NextResponse.next();
  }

  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));
  const accessToken = request.cookies.get('access_token')?.value?.trim();
  const refreshToken = request.cookies.get('refresh_token')?.value?.trim();
  const hasSession = Boolean(accessToken || refreshToken);

  if (!hasSession && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (hasSession && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
