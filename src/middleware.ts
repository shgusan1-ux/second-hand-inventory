import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const session = request.cookies.get('inventory_session');
    const { pathname } = request.nextUrl;

    // Public paths
    if (pathname === '/login' || pathname === '/register') {
        // Allow access even if session exists to let the client handle the splash screen / flow
        return NextResponse.next();
    }

    // Protected paths (all others)
    if (!session) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
