import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { adminCookie, validAdminSession } from './admin-auth';

export async function adminAccess() {
  const cookieStore = await cookies();
  if (!validAdminSession(cookieStore.get(adminCookie)?.value)) {
    return NextResponse.json({ error: 'Admin sifatida tizimga kiring' }, { status: 401 });
  }
  return null;
}
