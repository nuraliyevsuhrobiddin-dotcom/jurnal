import { describe, expect, it, vi, afterEach } from 'vitest';
import JSZip from 'jszip';
import { staffIdentity, staffPathAllowed, legacyAdminEnabled } from '@/lib/staff-auth';
import { backupTables, createBackupArchive, verifyBackupArchive, safeBackupPath } from '@/lib/content-backup';
import { createServerClient } from '@/lib/supabase/server';
import { publicIntegrationStatuses } from '@/lib/public-integrations';
import type { SupabaseClient } from '@supabase/supabase-js';
vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn(() => null) }));
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe('Staff authorization', () => {
  it('denies reviewers all admin routes and reserves account/security/backup administration for owners', () => {
    for (const path of ['/admin','/admin/articles','/api/admin/articles','/api/admin/settings','/admin/backups']) expect(staffPathAllowed('reviewer', path)).toBe(false);
    for (const path of ['/admin/staff','/api/admin/staff','/api/admin/staff/id','/api/admin/backups','/admin/settings','/api/admin/audit-logs']) {
      expect(staffPathAllowed('editor', path)).toBe(false); expect(staffPathAllowed('owner', path)).toBe(true);
    }
    expect(staffPathAllowed('editor', '/admin/reviews')).toBe(true);
    expect(staffPathAllowed('reviewer', '/api/reviewer/assignments')).toBe(true);
  });
  it('requires a verified Auth user, active server-owned role and aal2 independently', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { role: 'reviewer', active: true }, error: null });
    const client = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'account', email: 'reviewer@example.test' } }, error: null }), mfa: { getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({ data: { currentLevel: 'aal1' }, error: null }) } } };
    vi.mocked(createServerClient).mockReturnValue({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }) } as unknown as SupabaseClient);
    expect((await staffIdentity(client as unknown as SupabaseClient))?.mfa).toBe(false);
    client.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: 'aal2' }, error: null });
    expect((await staffIdentity(client as unknown as SupabaseClient))?.mfa).toBe(true);
    maybeSingle.mockResolvedValue({ data: { role: 'reviewer', active: false }, error: null });
    expect(await staffIdentity(client as unknown as SupabaseClient)).toBeNull();
    client.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('revoked') } as never);
    expect(await staffIdentity(client as unknown as SupabaseClient)).toBeNull();
  });
  it('closes legacy access when disabled and fails closed on security-table read errors', async () => {
    vi.stubEnv('LEGACY_ADMIN_LOGIN', 'false'); expect(await legacyAdminEnabled()).toBe(false);
    vi.stubEnv('LEGACY_ADMIN_LOGIN', '');
    const single = vi.fn().mockResolvedValue({ data: { legacy_login_enabled: false }, error: null });
    vi.mocked(createServerClient).mockReturnValue({ from: () => ({ select: () => ({ eq: () => ({ single }) }) }) } as unknown as SupabaseClient);
    expect(await legacyAdminEnabled()).toBe(false);
    single.mockResolvedValue({ data: null, error: { message: 'missing migration' } } as never);
    await expect(legacyAdminEnabled()).rejects.toThrow();
  });
});

describe('Portable content backup', () => {
  const empty = (): Record<string, unknown[]> => Object.fromEntries(backupTables.map(table => [table, []]));
  it('round-trips every required table and binary file with hashes and exact row counts', async () => {
    const tables = empty(); tables.articles = [{ id: 'article', title_uz: 'Scientific research' }];
    const { bytes } = await createBackupArchive(tables, [{ path: 'storage/journal-pdfs/article.pdf', bytes: new Uint8Array([0, 1, 255]) }]);
    const verified = await verifyBackupArchive(bytes);
    expect(verified.restored).toEqual(tables); expect(verified.manifest.files).toHaveLength(backupTables.length + 1);
  });
  it('detects altered data, missing files, omitted tables and path traversal', async () => {
    const { bytes } = await createBackupArchive(empty(), []);
    const tampered = await JSZip.loadAsync(bytes); tampered.file('tables/articles.json', '[{"id":"injected"}]');
    await expect(verifyBackupArchive(await tampered.generateAsync({ type: 'uint8array' }))).rejects.toThrow('Checksum');
    const missing = await JSZip.loadAsync(bytes); missing.remove('tables/articles.json');
    await expect(verifyBackupArchive(await missing.generateAsync({ type: 'uint8array' }))).rejects.toThrow('Missing');
    await expect(createBackupArchive({}, [])).rejects.toThrow('Missing table');
    for (const path of ['../leak','/absolute','storage/../leak','storage\\leak','storage/C:/leak']) {
      expect(safeBackupPath(path)).toBe(false);
      await expect(createBackupArchive(empty(), [{ path, bytes: new Uint8Array() }])).rejects.toThrow('Unsafe');
    }
  });
});

describe('Public provider status', () => {
  it('shows sandbox and production configuration without exposing secrets or claiming indexing', () => {
    vi.stubEnv('ZENODO_ACCESS_TOKEN','synthetic-only-token'); vi.stubEnv('ZENODO_MODE','sandbox');
    vi.stubEnv('CROSSREF_USERNAME',''); vi.stubEnv('CROSSREF_PASSWORD','');
    vi.stubEnv('ORCID_MODE','production'); vi.stubEnv('ORCID_PRODUCTION_ENABLED','true');
    vi.stubEnv('ORCID_CLIENT_ID','synthetic-client'); vi.stubEnv('ORCID_CLIENT_SECRET','synthetic-secret');
    vi.stubEnv('ORCID_COOKIE_SECRET','synthetic-cookie-secret');
    const labels = publicIntegrationStatuses('en');
    expect(labels).toEqual(['Metadata ready','Account and DOI prefix required','Test environment','Production configured']);
    expect(labels.join(' ')).not.toContain('synthetic');
  });
});
