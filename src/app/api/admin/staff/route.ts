import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminAccess } from '@/lib/admin-access';
import { staffAuthClient, staffIdentity } from '@/lib/staff-auth';
import { createServerClient } from '@/lib/supabase/server';
import { boundedBody } from '@/lib/bounded-body';
import { protectRequest } from '@/lib/request-limit';
import { queueNotificationOnce } from '@/lib/notifications';
import { siteUrl } from '@/lib/site-url';
import { logAudit } from '@/lib/db';

const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
export async function GET() {
  const denied = await adminAccess(['owner']); if (denied) return denied;
  const db = createServerClient(); if (!db) return reply({ error: 'Supabase kerak.' }, 503);
  const [accounts, security] = await Promise.all([db.from('staff_accounts').select('id,email,role,active,created_at').order('created_at'), db.from('staff_security').select('legacy_login_enabled').eq('id', true).single()]);
  if (accounts.error || security.error) return reply({ error: 'Migration 013 kerak.' }, 503);
  return reply({ accounts: accounts.data, legacyLoginEnabled: security.data.legacy_login_enabled });
}
export async function POST(request: NextRequest) {
  const denied = await adminAccess(['owner']); if (denied) return denied;
  if (request.headers.get('origin') !== request.nextUrl.origin) return reply({ error: 'Invalid origin' }, 403);
  const limited = await protectRequest(request, 'staff-invite', 10, 3600); if (limited) return limited;
  try {
    const values = z.object({ email: z.string().email().max(254).transform(s => s.toLowerCase().trim()), role: z.enum(['owner', 'editor', 'reviewer']), send_email: z.boolean().default(false) }).parse(JSON.parse(new TextDecoder().decode(await boundedBody(request, 4096))));
    const db = createServerClient(); if (!db) return reply({ error: 'Supabase kerak.' }, 503);
    const { data: existing, error: readError } = await db.from('staff_accounts').select('id').eq('email', values.email).maybeSingle();
    if (readError) return reply({ error: 'Migration 013 kerak.' }, 503);
    if (existing) return reply({ error: 'Hisob mavjud. Qayta taklif yuborish uchun hisob egasi bilan bog‘laning.' }, 409);
    const { data, error } = await db.auth.admin.generateLink({ type: 'invite', email: values.email });
    if (error || !data.user || !data.properties?.hashed_token) return reply({ error: 'Taklif yaratilmagan. Supabase hisob sozlamalarini tekshiring.' }, 400);
    const { error: saveError } = await db.from('staff_accounts').insert({ id: data.user.id, email: values.email, role: values.role });
    if (saveError) return reply({ error: 'Hisob roli saqlanmadi. Admin orqali tekshiring.' }, 503);
    const activationUrl = siteUrl('/staff/activate') + '#token=' + encodeURIComponent(data.properties.hashed_token);
    if (values.send_email) await queueNotificationOnce(`staff-invite:${data.user.id}`, { recipient: values.email, subject: 'AGM Journal — tahririyat hisobiga taklif', body: `AGM Journal tahririyat hisobingiz uchun taklif. Rol: ${values.role}.\n\nParolni belgilang va authenticator orqali ikki bosqichli kirishni yoqing:\n${activationUrl}\n\nHavola bir martalik. Uni boshqalarga bermang.` });
    await logAudit('staff_invited', 'staff_account', data.user.id, { role: values.role });
    return reply({ success: true, activationUrl, emailQueued: values.send_email });
  } catch { return reply({ error: 'Email va rolni tekshiring.' }, 400); }
}
export async function PATCH(request: NextRequest) {
  const denied = await adminAccess(['owner']); if (denied) return denied;
  if (request.headers.get('origin') !== request.nextUrl.origin) return reply({ error: 'Invalid origin' }, 403);
  const db = createServerClient(); if (!db) return reply({ error: 'Supabase kerak.' }, 503);
  try {
    const body = JSON.parse(new TextDecoder().decode(await boundedBody(request, 4096)));
    if (body.action === 'resend_invite') {
      const values = z.object({ id: z.string().uuid(), send_email: z.boolean().default(false) }).parse(body);
      const limited = await protectRequest(request, 'staff-recovery', 10, 3600); if (limited) return limited;
      const { data: account, error: readError } = await db.from('staff_accounts').select('id,email,active').eq('id', values.id).single();
      if (readError || !account?.active) return reply({ error: 'Faol hisob topilmadi.' }, 404);
      const { data, error } = await db.auth.admin.generateLink({ type: 'recovery', email: account.email });
      if (error || !data.properties?.hashed_token) return reply({ error: 'Yangi havola yaratilmagan.' }, 503);
      const activationUrl = siteUrl('/staff/activate') + '#token=' + encodeURIComponent(data.properties.hashed_token) + '&type=recovery';
      if (values.send_email) await queueNotificationOnce(`staff-recovery:${account.id}:${Date.now()}`, { recipient: account.email, subject: 'AGM Journal — yangi kirish havolasi', body: `Hisob parolini yangilash uchun bir martalik havola:\n${activationUrl}\n\nAuthenticator himoyasi saqlanadi. Bu havolani boshqalarga bermang.` });
      await logAudit('staff_recovery_created', 'staff_account', account.id);
      return reply({ success: true, activationUrl, emailQueued: values.send_email });
    }
    if (body.action === 'disable_legacy') {
      const identity = await staffIdentity(await staffAuthClient());
      if (identity?.role !== 'owner' || !identity.mfa) return reply({ error: 'Avval bosh muharrir hisobiga email va authenticator bilan kiring.' }, 403);
      const { error } = await db.from('staff_security').update({ legacy_login_enabled: false }).eq('id', true);
      if (error) throw error;
      await logAudit('legacy_login_disabled', 'security', 'staff_security');
      return reply({ success: true });
    }
    const { id, active } = z.object({ id: z.string().uuid(), active: z.boolean() }).parse(body);
    // Owners cannot be disabled here: this prevents removing the last owner, including concurrent requests.
    const { data, error } = await db.from('staff_accounts').update({ active }).eq('id', id).neq('role', 'owner').select('id').maybeSingle();
    if (error || !data) return reply({ error: 'Hisob o‘zgartirilmadi. Bosh muharrir hisobini bu yerdan yopib bo‘lmaydi.' }, 400);
    await logAudit('staff_access_changed', 'staff_account', id, { active });
    return reply({ success: true });
  } catch { return reply({ error: 'Hisobni o‘zgartirib bo‘lmadi.' }, 400); }
}
