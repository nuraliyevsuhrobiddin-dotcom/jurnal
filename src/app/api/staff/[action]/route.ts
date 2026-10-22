import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import QRCode from 'qrcode';
import { boundedBody } from '@/lib/bounded-body';
import { protectRequest } from '@/lib/request-limit';
import { staffAuthClient, staffIdentity } from '@/lib/staff-auth';
import { adminCookie } from '@/lib/admin-auth';

const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });

export async function GET(_request: NextRequest, context: { params: Promise<{ action: string }> }) {
  if ((await context.params).action !== 'me') return reply({ error: 'Not found' }, 404);
  const client = await staffAuthClient();
  const identity = await staffIdentity(client);
  if (!identity) return reply({ error: 'Hisobga kiring.' }, 401);
  const { data, error } = await client.auth.mfa.listFactors();
  if (error) return reply({ error: 'MFA holatini tekshirib bo‘lmadi.' }, 503);
  return reply({ ...identity, factors: data.totp.filter(f => f.status === 'verified').map(f => ({ id: f.id, name: f.friendly_name })) });
}

export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return reply({ error: 'Invalid origin' }, 403);
  const action = (await context.params).action;
  const limited = await protectRequest(request, `staff-auth-${action}`, action === 'verify' ? 10 : 15, 900); if (limited) return limited;
  try {
    const client = await staffAuthClient();
    const body = JSON.parse(new TextDecoder().decode(await boundedBody(request, 8192)));
    if (action === 'logout') {
      await client.auth.signOut();
      const response = reply({ success: true }); response.cookies.delete(adminCookie); return response;
    }
    if (action === 'login') {
      const values = z.object({ email: z.string().email(), password: z.string().min(1).max(256) }).parse(body);
      const { error } = await client.auth.signInWithPassword(values);
      if (error) return reply({ error: 'Email yoki parol noto‘g‘ri.' }, 401);
      const identity = await staffIdentity(client);
      if (!identity) { await client.auth.signOut(); return reply({ error: 'Hisobga tahririyat ruxsati berilmagan.' }, 403); }
      const response = reply({ success: true, redirect: '/staff/security' }); response.cookies.delete(adminCookie); return response;
    }
    if (action === 'activate') {
      const values = z.object({ token_hash: z.string().min(20).max(512), type: z.enum(['invite','recovery']).default('invite'), password: z.string().min(12).max(128) }).parse(body);
      const { error } = await client.auth.verifyOtp({ token_hash: values.token_hash, type: values.type });
      if (error) return reply({ error: 'Taklif muddati tugagan yoki ishlatilgan. Yangi taklif so‘rang.' }, 400);
      if (!await staffIdentity(client)) { await client.auth.signOut(); return reply({ error: 'Hisob faollashtirilmagan.' }, 403); }
      const { error: passwordError } = await client.auth.updateUser({ password: values.password });
      if (passwordError) return reply({ error: 'Parolni saqlab bo‘lmadi. Kuchliroq parol tanlang.' }, 400);
      const response = reply({ success: true, redirect: '/staff/security' }); response.cookies.delete(adminCookie); return response;
    }
    const identity = await staffIdentity(client);
    if (!identity) return reply({ error: 'Hisobga kiring.' }, 401);
    if (action === 'enroll') {
      const { data: factors, error: listError } = await client.auth.mfa.listFactors();
      if (listError) return reply({ error: 'MFA holati olinmadi.' }, 503);
      if (factors.totp.some(f => f.status === 'verified')) return reply({ error: 'Tasdiqlangan authenticator mavjud; kirish kodini kiriting.' }, 409);
      for (const factor of factors.all) {
        if (factor.status === 'unverified') await client.auth.mfa.unenroll({ factorId: factor.id });
      }
      const { data, error } = await client.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'AGM Journal' });
      if (error) return reply({ error: 'Authenticator ulanmadi.' }, 400);
      return reply({ factorId: data.id, qr: await QRCode.toDataURL(data.totp.uri), secret: data.totp.secret });
    }
    if (action === 'verify') {
      const values = z.object({ factorId: z.string().uuid(), code: z.string().regex(/^\d{6}$/) }).parse(body);
      const { error } = await client.auth.mfa.challengeAndVerify(values);
      if (error) return reply({ error: 'Kod noto‘g‘ri yoki eskirgan.' }, 401);
      return reply({ success: true, redirect: identity.role === 'reviewer' ? '/reviewer' : '/admin' });
    }
    return reply({ error: 'Not found' }, 404);
  } catch { return reply({ error: 'So‘rovni tekshiring yoki qayta urinib ko‘ring.' }, 400); }
}
