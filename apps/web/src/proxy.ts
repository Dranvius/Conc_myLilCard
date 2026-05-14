import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const publicPaths = ['/login', '/register', '/lead'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));
  const hasSession = request.cookies.has('access_token');

  if (!hasSession && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (hasSession && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
