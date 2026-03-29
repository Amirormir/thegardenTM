import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

function buildSignInUrl(request: NextRequest) {
  const signInUrl = new URL('/api/auth/signin', request.nextUrl.origin);
  signInUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
  return signInUrl;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const secret = process.env.NEXTAUTH_SECRET;

  if (!secret) {
    return NextResponse.redirect(buildSignInUrl(request));
  }

  const token = await getToken({
    req: request,
    secret,
  });

  if (!token?.sub) {
    return NextResponse.redirect(buildSignInUrl(request));
  }

  if (pathname.startsWith('/admin') && token.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/team', request.nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/team/:path*', '/admin/:path*', '/notifications/:path*', '/profile/:path*'],
};
