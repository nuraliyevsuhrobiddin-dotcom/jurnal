import { beforeEach, describe, expect, it, vi } from 'vitest';

const { from, rpc, client } = vi.hoisted(() => {
  const from = vi.fn();
  const rpc = vi.fn();
  return { from, rpc, client: { from, rpc } };
});

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => client,
  isServerSupabaseConfigured: true,
}));

import { remoteRows, remoteSave, remoteSettings, remoteSaveArticle, normalizeRemoteArticle } from '@/lib/remote-db';
import { journalStore } from '@/lib/data-store';
import { JournalStore } from '@/lib/data-store';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

describe('Hosted persistence safeguards', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stores a manual discipline in the same atomic article operation and restores it on read', async () => {
    rpc.mockResolvedValue({ error: null });
    const paper = { ...journalStore.articles[0], subject_id: 'economics-business', submission_notes: 'Original author notes' };
    await remoteSaveArticle(paper);
    const saved = rpc.mock.calls[0][1].article_data;
    expect(saved.subject_id).toBeUndefined();
    expect(saved.submission_notes).toContain('[AGM_SUBJECT:economics-business]');
    const restored = normalizeRemoteArticle({ ...saved, authors: paper.authors });
    expect(restored.subject_id).toBe('economics-business'); expect(restored.submission_notes).toBe('Original author notes');
  });

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
