import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { adminCookie, validAdminSession } from './admin-auth';
import { legacyAdminEnabled, staffAuthClient, staffIdentity, type StaffRole } from './staff-auth';

export async function adminAccess(roles: StaffRole[] = ['owner', 'editor']) {
  const cookieStore = await cookies();
  if (validAdminSession(cookieStore.get(adminCookie)?.value) && await legacyAdminEnabled()) return null;
  if (cookieStore.getAll().some(cookie => cookie.name.startsWith('agm-staff'))) {
    const identity = await staffIdentity(await staffAuthClient());
    if (identity?.mfa && roles.includes(identity.role)) return null;
    if (identity) return NextResponse.json({ error: identity.mfa ? 'Bu amal uchun ruxsat yo‘q.' : 'Ikki bosqichli kirishni tasdiqlang.' }, { status: 403 });
  }
  return NextResponse.json({ error: 'Admin sifatida tizimga kiring' }, { status: 401 });
}
