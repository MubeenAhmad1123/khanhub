// apps/web/src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Set x-pathname header so layout and server components can read the current route
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', pathname);

  // Protect all HQ dashboard routes.
  if (pathname.startsWith('/hq/dashboard')) {
    // Exempt the daily report page from middleware redirect so client-side localStorage can authorize it.
    if (pathname === '/hq/dashboard/manager/reports/daily' || pathname.startsWith('/hq/dashboard/manager/reports/daily/')) {
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    const cookie = req.cookies.get('hq_session')?.value;
    if (!cookie) {
      const url = req.nextUrl.clone();
      url.pathname = '/hq/login';
      return NextResponse.redirect(url);
    }
    // Basic parse check; fine-grained role checks still happen per page and server actions.
    try {
      JSON.parse(cookie);
    } catch {
      const url = req.nextUrl.clone();
      url.pathname = '/hq/login';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - icons (PWA icons)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|icons).*)',
  ],
};
