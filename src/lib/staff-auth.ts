import { createServerClient as createSSRClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from './supabase/server';

export type StaffRole = 'owner' | 'editor' | 'reviewer';
export interface StaffIdentity { id: string; email: string; role: StaffRole; mfa: boolean }
export const staffCookieOptions = { name: 'agm-staff', httpOnly: true, sameSite: 'strict' as const, secure: process.env.NODE_ENV === 'production', path: '/' };

export async function staffAuthClient() {
  const jar = await cookies();
  return createSSRClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: staffCookieOptions,
    cookies: { getAll: () => jar.getAll(), setAll: values => { for (const { name, value, options } of values) jar.set(name, value, options); } },
  });
}

export async function staffIdentity(client: SupabaseClient): Promise<StaffIdentity | null> {
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  const db = createServerClient();
  if (!db) return null;
  const { data, error: roleError } = await db.from('staff_accounts').select('role,active').eq('id', user.id).maybeSingle();
  if (roleError) throw new Error('Staff accounts unavailable. Apply migration 013.');
  if (!data?.active || !['owner', 'editor', 'reviewer'].includes(data.role)) return null;
  const { data: assurance, error: assuranceError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError) return null;
  return { id: user.id, email: user.email || '', role: data.role, mfa: assurance?.currentLevel === 'aal2' };
}

export async function legacyAdminEnabled() {
  if (process.env.LEGACY_ADMIN_LOGIN === 'false') return false;
  const db = createServerClient();
  if (!db) return true;
  const { data, error } = await db.from('staff_security').select('legacy_login_enabled').eq('id', true).single();
  if (error) throw new Error('Staff security unavailable. Apply migration 013.');
  return data.legacy_login_enabled === true;
}

export function staffPathAllowed(role: StaffRole, pathname: string) {
  if (pathname.startsWith('/reviewer') || pathname.startsWith('/api/reviewer')) return true;
  if (role === 'reviewer') return false;
  if (role === 'owner') return true;
  return !['/admin/staff', '/admin/backups', '/admin/settings', '/admin/audit-logs', '/api/admin/staff', '/api/admin/backups', '/api/admin/settings', '/api/admin/audit-logs'].some(p => pathname === p || pathname.startsWith(p + '/'));
}
