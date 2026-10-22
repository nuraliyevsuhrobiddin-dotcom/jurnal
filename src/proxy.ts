import { NextRequest, NextResponse } from 'next/server';
import { adminCookie, validAdminSession } from '@/lib/admin-auth';
import { createServerClient as createSSRClient } from '@supabase/ssr';
import { legacyAdminEnabled, staffCookieOptions, staffIdentity, staffPathAllowed } from '@/lib/staff-auth';

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === '/admin/login' || pathname === '/api/admin/session') return NextResponse.next();
  const session = request.cookies.get(adminCookie)?.value;
  let response = NextResponse.next();
  let allowed = false;
  try {
    if (request.cookies.getAll().some(cookie => cookie.name.startsWith('agm-staff'))) {
      const client = createSSRClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        cookieOptions: staffCookieOptions,
        cookies: { getAll: () => request.cookies.getAll(), setAll: values => {
          for (const { name, value } of values) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of values) response.cookies.set(name, value, options);
        } },
      });
      const identity = await staffIdentity(client);
      if (identity && !identity.mfa) return pathname.startsWith('/api/') ? NextResponse.json({ error: 'MFA required' }, { status: 403 }) : NextResponse.redirect(new URL('/staff/security', request.url));
      if (identity && !staffPathAllowed(identity.role, pathname)) return NextResponse.json({ error: 'Ruxsat yo‘q.' }, { status: 403 });
      allowed = Boolean(identity?.mfa);
    }
    if (!allowed && !pathname.startsWith('/reviewer') && !pathname.startsWith('/api/reviewer')) allowed = validAdminSession(session) && await legacyAdminEnabled();
  } catch { return NextResponse.json({ error: 'Kirishni tekshirish vaqtincha ishlamayapti.' }, { status: 503 }); }
  if (allowed) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const origin = request.headers.get('origin');
      if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }
  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Admin sifatida tizimga kiring' }, { status: 401 });
  return NextResponse.redirect(new URL('/admin/login', request.url));
}

export const config = { matcher: ['/admin/:path*', '/api/admin/:path*', '/reviewer/:path*', '/api/reviewer/:path*'] };
