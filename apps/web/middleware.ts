import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export default auth((request) => {
  const session = request.auth;
  const pathname = request.nextUrl.pathname;

  if (!session?.user) {
    const signInUrl = new URL('/api/auth/signin', request.nextUrl.origin);
    signInUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (pathname.startsWith('/admin') && session.user.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/team', request.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/team/:path*', '/admin/:path*'],
};
