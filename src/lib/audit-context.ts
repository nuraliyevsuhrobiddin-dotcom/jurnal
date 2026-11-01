import { cookies, headers } from 'next/headers';
import { isIP } from 'node:net';
import { adminCookie, validAdminSession } from './admin-auth';
import { legacyAdminEnabled, staffAuthClient, staffIdentity } from './staff-auth';

interface AuditContext {
  user_email: string;
  ip_address?: string;
  actor: { type: 'staff' | 'legacy_admin' | 'development_admin' | 'anonymous' | 'system' | 'unknown'; id?: string; role?: string };
}

export async function auditContext(): Promise<AuditContext> {
  let jar: Awaited<ReturnType<typeof cookies>>;
  let requestHeaders: Awaited<ReturnType<typeof headers>>;
  try { [jar, requestHeaders] = await Promise.all([cookies(), headers()]); }
  catch { return { user_email: 'system', actor: { type: 'system' } }; }

  const forwarded = process.env.VERCEL ? requestHeaders.get('x-vercel-forwarded-for')?.split(',')[0] :
    process.env.TRUST_PROXY_IP === 'true' ? requestHeaders.get('x-real-ip') : undefined;
  const ip = forwarded?.trim();
  const ip_address = ip && isIP(ip) ? ip : undefined;
  try {
    if (jar.getAll().some(cookie => cookie.name.startsWith('agm-staff'))) {
      const identity = await staffIdentity(await staffAuthClient());
      if (identity?.mfa) return { user_email: identity.email, ip_address, actor: { type: 'staff', id: identity.id, role: identity.role } };
    }
    if (validAdminSession(jar.get(adminCookie)?.value) && await legacyAdminEnabled()) {
      const type = process.env.ADMIN_PASSWORD ? 'legacy_admin' : 'development_admin';
      return { user_email: type, ip_address, actor: { type } };
    }
    return { user_email: 'anonymous', ip_address, actor: { type: 'anonymous' } };
  } catch {
    // Do not lose a committed action's audit record if identity lookup fails.
    return { user_email: 'unknown', ip_address, actor: { type: 'unknown' } };
  }
}
