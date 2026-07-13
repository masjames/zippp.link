import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/** Public path prefixes — no auth required */
const PUBLIC_PREFIXES = ['/', '/s/', '/api/', '/community'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => {
    if (prefix === '/') return pathname === '/';
    return pathname.startsWith(prefix);
  });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public routes
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // /z-cms — ADMIN only
  if (pathname.startsWith('/z-cms')) {
    if (!token || token.role !== 'ADMIN') {
      const url = request.nextUrl.clone();
      url.pathname = '/app/dashboard';
      url.searchParams.set('error', 'access_denied');
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // /app — authenticated users only
  if (pathname.startsWith('/app')) {
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = '/api/auth/signin';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     *  - _next/static  (Next.js static files)
     *  - _next/image   (Next.js image optimisation)
     *  - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
