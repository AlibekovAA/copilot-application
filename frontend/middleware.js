import { NextResponse } from 'next/server';

// Список валидных роутов
const validRoutes = ['/', '/auth'];

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Разрешаем доступ к auth странице и статическим файлам
  if (pathname.startsWith('/auth') || 
      pathname.startsWith('/_next') || 
      pathname.startsWith('/api') ||
      pathname.includes('.')) {
    return NextResponse.next();
  }

  const authToken = request.cookies.get('auth_token')?.value;

  // Если роут не существует - редирект
  if (!validRoutes.includes(pathname)) {
    if (authToken) {
      // Если авторизован - редирект на главную
      return NextResponse.redirect(new URL('/', request.url));
    } else {
      // Если не авторизован - редирект на auth
      return NextResponse.redirect(new URL('/auth', request.url));
    }
  }

  // Для главной страницы проверяем авторизацию
  if (!authToken && pathname === '/') {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
};

