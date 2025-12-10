import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.DASHBOARD_JWT_SECRET || 'your-secret-key-change-this-in-production'
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /dashboard/pretium route (but not login page)
  if (pathname.startsWith('/dashboard/pretium') && !pathname.startsWith('/dashboard/pretium/login')) {
    const token = request.cookies.get('pretium-dashboard-session');

    if (!token) {
      return NextResponse.redirect(new URL('/dashboard/pretium/login', request.url));
    }

    try {
      await jwtVerify(token.value, SECRET_KEY);
      // Token is valid, continue
      return NextResponse.next();
    } catch {
      // Token is invalid, redirect to login
      return NextResponse.redirect(new URL('/dashboard/pretium/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/dashboard/pretium/:path*',
};
