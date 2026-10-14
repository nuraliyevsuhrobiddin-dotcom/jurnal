import { NextRequest, NextResponse } from 'next/server';
import { adminCookie, validAdminSession } from '@/lib/admin-auth';

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === '/admin/login' || pathname === '/api/admin/session') return NextResponse.next();
  const session = request.cookies.get(adminCookie)?.value;
  if (validAdminSession(session)) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const origin = request.headers.get('origin');
      if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }
  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Admin sifatida tizimga kiring' }, { status: 401 });
  return NextResponse.redirect(new URL('/admin/login', request.url));
}

export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] };
