import { NextRequest, NextResponse } from 'next/server';
import { adminCookie, createAdminSession, validAdminPassword } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  if (!process.env.ADMIN_PASSWORD) return NextResponse.json({ error: 'Serverda ADMIN_PASSWORD sozlanmagan.' }, { status: 503 });
  try {
    const { password } = await request.json();
    if (!validAdminPassword(password)) return NextResponse.json({ error: 'Parol noto‘g‘ri.' }, { status: 401 });
    const response = NextResponse.json({ success: true });
    response.cookies.set(adminCookie, createAdminSession(), { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 8 * 60 * 60 });
    return response;
  } catch {
    return NextResponse.json({ error: 'Parolni kiriting.' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  const response = NextResponse.json({ success: true });
  response.cookies.delete(adminCookie);
  return response;
}
