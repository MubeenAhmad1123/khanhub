import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. Skip paths that don't need middleware
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/static') ||
        pathname.includes('.') ||
        pathname.startsWith('/admin') // Admin routes handle their own auth
    ) {
        return NextResponse.next();
    }

    // 2. Auth state check
    // Note: In a real Next.js + Firebase app, you'd check for a session cookie here.
    // For now, we check for 'session-token' as a placeholder.
    const isAuthenticated = request.cookies.has('session-token') || request.cookies.has('auth-token');

    // 3. Define route groups
    const authRoutes = ['/auth/login', '/auth/register', '/auth/reset-password', '/auth/verify-payment'];
    const protectedRoutes = ['/dashboard/settings']; // Reduced scope since client-side auth handles most protection

    const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

    // 4. Implement redirect logic

    // We no longer strictly redirect protected routes here because Firebase client-side 
    // auth handles it, and we don't currently have a session cookie synced.

    // Default: allow
    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
    ],
};
