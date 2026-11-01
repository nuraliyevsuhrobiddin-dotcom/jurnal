import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { cookies, headers } from 'next/headers';
import { staffIdentity, legacyAdminEnabled } from '@/lib/staff-auth';
import { createAdminSession } from '@/lib/admin-auth';
import { auditContext } from '@/lib/audit-context';
import { logAudit } from '@/lib/db';
import { journalStore } from '@/lib/data-store';

vi.mock('next/headers', () => ({ cookies: vi.fn(), headers: vi.fn() }));
vi.mock('@/lib/staff-auth', () => ({ staffIdentity: vi.fn(), staffAuthClient: vi.fn(), legacyAdminEnabled: vi.fn(async () => true) }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: () => null, isServerSupabaseConfigured: false }));

const jar = (values: { name: string; value: string }[]) => ({ getAll: () => values, get: (name: string) => values.find(value => value.name === name) });
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('ADMIN_PASSWORD', 'audit-test-password');
  vi.stubEnv('VERCEL', ''); vi.stubEnv('TRUST_PROXY_IP', '');
  vi.mocked(cookies).mockResolvedValue(jar([]) as never);
  vi.mocked(headers).mockResolvedValue(new Headers({ 'x-real-ip': '203.0.113.9', 'x-forwarded-for': '203.0.113.10' }) as never);
  vi.mocked(legacyAdminEnabled).mockResolvedValue(true);
});
afterEach(() => vi.unstubAllEnvs());

describe('Audit attribution', () => {
  it('records the verified staff member and excludes untrusted IP headers', async () => {
    vi.mocked(cookies).mockResolvedValue(jar([{ name: 'agm-staff', value: 'session' }]) as never);
    vi.mocked(staffIdentity).mockResolvedValue({ id: 'staff-id', email: 'editor@example.test', role: 'editor', mfa: true });
    await logAudit('ARTICLE_UPDATE', 'article', 'article-id', { field: 'title' });
    expect(journalStore.auditLogs[0]).toMatchObject({ user_email: 'editor@example.test', details: { field: 'title', actor: { type: 'staff', id: 'staff-id', role: 'editor' } } });
    expect(journalStore.auditLogs[0].ip_address).toBeUndefined();
  });
  it('labels shared legacy login without inventing a staff email', async () => {
    vi.mocked(cookies).mockResolvedValue(jar([{ name: 'agm-admin', value: createAdminSession() }]) as never);
    expect(await auditContext()).toMatchObject({ user_email: 'legacy_admin', actor: { type: 'legacy_admin' } });
  });
  it('never attributes an unverified staff session to a staff member', async () => {
    vi.mocked(cookies).mockResolvedValue(jar([{ name: 'agm-staff', value: 'session' }]) as never);
    vi.mocked(staffIdentity).mockResolvedValue({ id: 'staff-id', email: 'editor@example.test', role: 'editor', mfa: false });
    expect((await auditContext()).actor.type).toBe('anonymous');
  });
  it('uses only validated addresses from configured trusted proxies', async () => {
    vi.stubEnv('TRUST_PROXY_IP', 'true');
    expect((await auditContext()).ip_address).toBe('203.0.113.9');
    vi.stubEnv('VERCEL', '1');
    vi.mocked(headers).mockResolvedValue(new Headers({ 'x-vercel-forwarded-for': '2001:db8::1, 203.0.113.2' }) as never);
    expect((await auditContext()).ip_address).toBe('2001:db8::1');
    vi.mocked(headers).mockResolvedValue(new Headers({ 'x-vercel-forwarded-for': 'spoofed' }) as never);
    expect((await auditContext()).ip_address).toBeUndefined();
  });
  it('retains an unknown actor on identity service failure and system attribution outside requests', async () => {
    vi.mocked(cookies).mockResolvedValue(jar([{ name: 'agm-staff', value: 'session' }]) as never);
    vi.mocked(staffIdentity).mockRejectedValue(new Error('Auth offline'));
    expect((await auditContext()).actor.type).toBe('unknown');
    vi.mocked(cookies).mockRejectedValue(new Error('Outside request'));
    expect((await auditContext()).actor.type).toBe('system');
  });
});
