import { beforeEach, describe, expect, it, vi } from 'vitest';
import { claimIntegrationJob, getIntegrationJob, saveIntegrationJob, type IntegrationJob } from '@/lib/integration-jobs';
import { createServerClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }));
const job: IntegrationJob = { id: 'a'.repeat(64), article_id: 'test-article', provider: 'zenodo', environment: 'sandbox', status: 'pending', message: 'Test', created_at: '2026-10-20T00:00:00Z', updated_at: '2026-10-20T00:00:00Z' };
const upload = vi.fn(); const download = vi.fn(); const table = vi.fn(); const bucket = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  const missing = { error: { code: 'PGRST205' }, data: null };
  table.mockReturnValue({ insert: vi.fn(async () => missing), update: vi.fn(() => ({ eq: vi.fn(async () => missing) })), select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => missing) })) })) });
  bucket.mockReturnValue({ upload, download });
  vi.mocked(createServerClient).mockReturnValue({ from: table, storage: { from: bucket } } as unknown as NonNullable<ReturnType<typeof createServerClient>>);
});

describe('Durable private storage ledger when migration 009 is absent', () => {
  it('claims a job atomically in the existing private manuscript bucket', async () => {
    upload.mockResolvedValue({ error: null });
    expect(await claimIntegrationJob(job)).toBe(true);
    expect(bucket).toHaveBeenCalledWith('journal-manuscripts');
    expect(upload).toHaveBeenCalledWith(`_integration-jobs/${job.id}.json`, JSON.stringify(job), { contentType: 'application/json', upsert: false });
  });
  it('treats a storage conflict as an existing claim and never overwrites it', async () => {
    upload.mockResolvedValue({ error: { statusCode: '409' } });
    expect(await claimIntegrationJob(job)).toBe(false);
  });
  it('reads a matching stored job and persists the final result', async () => {
    download.mockResolvedValue({ data: new Blob([JSON.stringify(job)]), error: null });
    expect(await getIntegrationJob(job.id)).toEqual(job);
    upload.mockResolvedValue({ error: null });
    const updated = { ...job, status: 'ready' as const };
    expect(await saveIntegrationJob(updated)).toEqual(updated);
    expect(upload.mock.calls.at(-1)?.[2].upsert).toBe(true);
  });
  it('fails closed for permission errors instead of assuming an absent job', async () => {
    download.mockResolvedValue({ data: null, error: { statusCode: '403' } });
    await expect(getIntegrationJob(job.id)).rejects.toThrow('o‘qib');
    upload.mockResolvedValue({ error: { statusCode: '403' } });
    await expect(claimIntegrationJob(job)).rejects.toThrow('saqlab');
  });
  it('does not fallback for a real database permission failure', async () => {
    table.mockReturnValue({ insert: vi.fn(async () => ({ error: { code: '42501' } })) });
    await expect(claimIntegrationJob(job)).rejects.toThrow();
    expect(upload).not.toHaveBeenCalled();
  });
});
