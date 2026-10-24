import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { interpretCrossrefReport, refreshCrossrefReport } from '@/lib/crossref-report';
import { getIntegrationJob, saveIntegrationJob, type IntegrationJob } from '@/lib/integration-jobs';
import { POST } from '@/app/api/admin/articles/[id]/deposit/route';
import { adminAccess } from '@/lib/admin-access';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/integration-jobs', () => ({ getIntegrationJob: vi.fn(), saveIntegrationJob: vi.fn(async job => job) }));
vi.mock('@/lib/admin-access', () => ({ adminAccess: vi.fn(async () => null) }));
vi.mock('@/lib/request-limit', () => ({ protectRequest: vi.fn(async () => null) }));
vi.mock('@/lib/db', () => ({ getArticleById: vi.fn(), getJournalSettings: vi.fn() }));
const batch = 'agm-11111111-1111-4111-8111-111111111111';
const articleId = '22222222-2222-4222-8222-222222222222';
const job: IntegrationJob = { id: 'a'.repeat(64), article_id: articleId, provider: 'crossref', environment: 'test', status: 'submitted', remote_id: batch, message: 'Queued', created_at: '2026-10-24T00:00:00Z', updated_at: '2026-10-24T00:00:00Z' };
const report = (state = 'Success', success = 1, failure = 0, warnings = 0) => `<?xml version="1.0"?><doi_batch_diagnostic><batch_id>${batch}</batch_id><record_diagnostic status="${state}"><doi>10.5555/fixture</doi><msg>Processed</msg></record_diagnostic><batch_data><record_count>1</record_count><success_count>${success}</success_count><failure_count>${failure}</failure_count><warning_count>${warnings}</warning_count></batch_data></doi_batch_diagnostic>`;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('CROSSREF_USERNAME', 'synthetic-user'); vi.stubEnv('CROSSREF_PASSWORD', 'synthetic-secret'); vi.stubEnv('CROSSREF_MODE', 'test');
  vi.stubEnv('INTEGRATION_PRODUCTION_ENABLED', 'false');
  vi.mocked(getIntegrationJob).mockResolvedValue({ ...job });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('Crossref processing reports', () => {
  it('confirms final processing, distinguishes failures, and flags warning conflicts', () => {
    expect(interpretCrossrefReport(report(), batch).status).toBe('ready');
    expect(interpretCrossrefReport(report('Failure', 0, 1), batch).status).toBe('failed');
    expect(interpretCrossrefReport(report('Warning', 0, 0, 1), batch).status).toBe('unknown');
  });
  it('never treats queue acceptance, another batch, broken XML or an entity document as registration', () => {
    for (const text of ['SUCCESS', '<html>Please login</html>', report().replace(batch, 'different-batch'), report().replace('</batch_data>', ''), '<!DOCTYPE test [<!ENTITY x "external">]>' + report(), report().replace('<record_count>1</record_count>', '<record_count>2</record_count>'), report().replace('status="Success"', 'status="Warning"')]) {
      expect(interpretCrossrefReport(text, batch).status).toBe('unknown');
    }
  });
  it('keeps a test success separate from a production registration and never leaks credentials', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(report())); vi.stubGlobal('fetch', fetcher);
    const saved = await refreshCrossrefReport(articleId, job.id);
    expect(saved.status).toBe('ready'); expect(saved.message).toContain('TEST');
    const url = new URL(String(fetcher.mock.calls[0][0]));
    expect(url.origin).toBe('https://test.crossref.org'); expect(url.searchParams.get('doi_batch_id')).toBe(batch);
    expect(fetcher.mock.calls[0][1]).toMatchObject({ redirect: 'error', cache: 'no-store' });
    expect(JSON.stringify(saved)).not.toContain('synthetic-secret');
  });
  it('does not request reports for another article, provider, environment or invalid job ID', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    await expect(refreshCrossrefReport(articleId, 'bad')).rejects.toThrow('identifikatori');
    await expect(refreshCrossrefReport('another-article', job.id)).rejects.toThrow('topilmadi');
    vi.mocked(getIntegrationJob).mockResolvedValueOnce({ ...job, provider: 'zenodo' });
    await expect(refreshCrossrefReport(articleId, job.id)).rejects.toThrow('topilmadi');
    vi.mocked(getIntegrationJob).mockResolvedValueOnce({ ...job, environment: 'production' });
    await expect(refreshCrossrefReport(articleId, job.id)).rejects.toThrow('rejimi');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('keeps the saved outcome unchanged on unavailable or oversized report responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('https://provider/?pwd=synthetic-secret')));
    await expect(refreshCrossrefReport(articleId, job.id)).rejects.toThrow('depozit qayta yuborilmadi');
    expect(saveIntegrationJob).not.toHaveBeenCalled();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x'.repeat(1024 * 1024 + 1))));
    await expect(refreshCrossrefReport(articleId, job.id)).rejects.toThrow('hisobotini');
    expect(saveIntegrationJob).not.toHaveBeenCalled();
  });
  it('preserves a previously confirmed outcome when a later report is not yet available', async () => {
    vi.mocked(getIntegrationJob).mockResolvedValueOnce({ ...job, status: 'ready' });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Report not available')));
    expect((await refreshCrossrefReport(articleId, job.id)).status).toBe('ready');
    expect(saveIntegrationJob).not.toHaveBeenCalled();
  });
  it('requires admin access before looking up a report', async () => {
    vi.mocked(adminAccess).mockResolvedValueOnce(new NextResponse(null, { status: 401 }));
    const response = await POST(new NextRequest('http://localhost/api/admin/articles/test/deposit', { method: 'POST', body: JSON.stringify({ provider: 'crossref', action: 'check_status', job_id: job.id }) }), { params: Promise.resolve({ id: articleId }) });
    expect(response.status).toBe(401); expect(getIntegrationJob).not.toHaveBeenCalled();
  });
  it('returns final-report status through the authenticated article route without a new deposit', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(report())));
    const response = await POST(new NextRequest('http://localhost/api/admin/articles/test/deposit', { method: 'POST', body: JSON.stringify({ provider: 'crossref', action: 'check_status', job_id: job.id }) }), { params: Promise.resolve({ id: articleId }) });
    expect(response.status).toBe(200); expect((await response.json()).job.status).toBe('ready');
  });
});
