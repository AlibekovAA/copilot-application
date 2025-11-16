import { NextResponse } from 'next/server';
import { VALID_ROUTES } from './app/utils/apiHelpers';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const authToken = request.cookies.get('auth_token')?.value;

  if (!VALID_ROUTES.includes(pathname)) {
    if (authToken) {
      return NextResponse.redirect(new URL('/', request.url));
    } else {
      return NextResponse.redirect(new URL('/auth', request.url));
    }
  }

  if (!authToken && pathname === '/') {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
};
