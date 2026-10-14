import { beforeEach, describe, expect, it, vi } from 'vitest';

const { from, client } = vi.hoisted(() => {
  const from = vi.fn();
  const rpc = vi.fn();
  return { from, rpc, client: { from, rpc } };
});

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => client,
  isServerSupabaseConfigured: true,
}));

import { remoteRows, remoteSave, remoteSettings } from '@/lib/remote-db';
import { JournalStore } from '@/lib/data-store';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

describe('Hosted persistence safeguards', () => {
  beforeEach(() => vi.clearAllMocks());

  it('propagates permission errors instead of switching storage', async () => {
    from.mockReturnValue({ select: () => Promise.resolve({ error: { message: 'permission denied for relation articles' } }) });
    await expect(remoteRows('articles')).rejects.toThrow('permission denied');
  });

  it('does not acknowledge writes when the database schema is missing', async () => {
    from.mockReturnValue({ upsert: () => Promise.resolve({ error: { message: 'relation contact_messages does not exist' } }) });
    await expect(remoteSave('contact_messages', { id: 'test' })).rejects.toThrow('does not exist');
  });

  it('requires seeded settings on a configured database', async () => {
    from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) });
    await expect(remoteSettings()).rejects.toThrow('Journal settings missing');
  });

  it('never writes local journal files when Supabase is configured', () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), 'agm-hosted-'));
    const originalVitest = process.env.VITEST;
    const originalDirectory = process.env.JOURNAL_DATA_DIR;
    try {
      delete process.env.VITEST;
      process.env.JOURNAL_DATA_DIR = directory;
      new JournalStore().persist();
      expect(existsSync(path.join(directory, 'journal.json'))).toBe(false);
    } finally {
      if (originalVitest === undefined) delete process.env.VITEST;
      else process.env.VITEST = originalVitest;
      if (originalDirectory === undefined) delete process.env.JOURNAL_DATA_DIR;
      else process.env.JOURNAL_DATA_DIR = originalDirectory;
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
