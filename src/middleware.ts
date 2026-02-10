import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'inventory_session';

// 로그인 없이 접근 가능한 경로
const publicPaths = [
  '/login',
  '/register',
  '/forgot-password',
  '/_next',
  '/api/auth',
  '/favicon.ico',
  '/logo.png',
  '/brown_street.svg',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public 경로는 통과
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 세션 쿠키 확인
  const session = request.cookies.get(SESSION_COOKIE_NAME);

  // 세션 없으면 로그인 페이지로 리다이렉트
  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 세션 있으면 통과
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
