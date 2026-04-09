// apps/web/src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect all HQ dashboard routes.
  if (pathname.startsWith('/hq/dashboard')) {
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

  return NextResponse.next();
}

export const config = {
  matcher: ['/hq/dashboard/:path*'],
};

