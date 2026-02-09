import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow all admin routes to pass through
    // Admin dashboard will handle its own auth
    if (pathname.startsWith('/admin')) {
        return NextResponse.next();
    }

    // Public routes that don't require authentication
    const publicPaths = [
        '/auth/login',
        '/auth/register',
        '/auth/reset-password',
    ];

    // Static assets and API routes - allow through
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/static') ||
        pathname.includes('.') // files like favicon.ico, images, etc.
    ) {
        return NextResponse.next();
    }

    // Allow homepage to be public (shows login buttons)
    if (pathname === '/') {
        return NextResponse.next();
    }

    // Check if current path is public
    const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

    // For now, allow all paths through since Firebase handles auth client-side
    // The pages themselves will redirect if user is not authenticated
    return NextResponse.next();
}

// Configure which routes this middleware runs on
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
    ],
};