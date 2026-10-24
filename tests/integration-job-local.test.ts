import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm, rename } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { claimIntegrationJob, getIntegrationJob, saveIntegrationJob, type IntegrationJob } from '@/lib/integration-jobs';

vi.mock('@/lib/supabase/server', () => ({ createServerClient: () => null }));
vi.mock('node:fs/promises', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return { ...actual, rename: vi.fn(actual.rename) };
});
let directory: string;
const job: IntegrationJob = { id: 'b'.repeat(64), article_id: 'local-test', provider: 'crossref', environment: 'test', status: 'pending', message: 'Claimed', created_at: '2026-10-24T00:00:00Z', updated_at: '2026-10-24T00:00:00Z' };
beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'agm-ledger-test-'));
  vi.stubEnv('JOURNAL_DATA_DIR', directory);
  vi.mocked(rename).mockClear();
});
afterEach(async () => { vi.unstubAllEnvs(); await rm(directory, { recursive: true, force: true }); });
describe('Local integration ledger atomic replacement', () => {
  it('retries a transient Windows sharing error without losing the claim or repeating a deposit', async () => {
    await claimIntegrationJob(job);
    vi.mocked(rename).mockRejectedValueOnce(Object.assign(new Error('Sharing violation'), { code: 'EPERM' }));
    const updated = { ...job, status: 'submitted' as const };
    await expect(saveIntegrationJob(updated)).resolves.toEqual(updated);
    expect(rename).toHaveBeenCalledTimes(2);
    expect(await getIntegrationJob(job.id)).toEqual(updated);
    expect(await claimIntegrationJob(job)).toBe(false);
  });
  it('preserves the readable old record when replacement fails permanently', async () => {
    await claimIntegrationJob(job);
    vi.mocked(rename).mockRejectedValueOnce(Object.assign(new Error('Disk full'), { code: 'ENOSPC' }));
    await expect(saveIntegrationJob({ ...job, status: 'ready' })).rejects.toThrow('Disk full');
    expect(await getIntegrationJob(job.id)).toEqual(job);
    expect(JSON.parse(await readFile(path.join(directory, 'integration-jobs', `${job.id}.json`), 'utf8'))).toEqual(job);
    expect(rename).toHaveBeenCalledTimes(1);
  });
  it('allows only one owner when claims race with reads and atomic updates', async () => {
    for (let index = 0; index < 30; index++) {
      const current = { ...job, id: index.toString(16).padStart(64, '0') };
      let owners = 0;
      await Promise.all([0, 1].map(async () => {
        if (await claimIntegrationJob(current)) { owners++; await saveIntegrationJob({ ...current, status: 'submitted' }); }
        else expect(await getIntegrationJob(current.id)).not.toBeNull();
      }));
      expect(owners).toBe(1);
      expect((await getIntegrationJob(current.id))?.status).toBe('submitted');
    }
  });
});
