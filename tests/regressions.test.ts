import { describe, expect, it } from 'vitest';
import { createArticle, getArticleBySlug, getPublishedArticles, getJournalSettings } from '@/lib/db';
import { journalStore, JournalStore } from '@/lib/data-store';
import { generateArticleTitlePagePdf } from '@/lib/pdf/generator';
import { createAdminSession, validAdminSession } from '@/lib/admin-auth';
import { mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('Runtime regressions', () => {
  it('matches Uzbek apostrophe variants and keyword searches', async () => {
    for (const query of ["sun'iy intellekt", 'sun‘iy intellekt', 'sunʼiy intellekt']) {
      const results = await getPublishedArticles({ query });
      expect(results.some(article => article.slug.startsWith('suniy-intellekt'))).toBe(true);
    }
    expect((await getPublishedArticles({ query: 'LSTM', limit: 1 })).length).toBe(1);
  });

  it('keeps unpublished article slugs private and assigns authors to their article', async () => {
    const draft = await createArticle({ ...journalStore.articles[0], slug: 'private-regression-draft', status: 'draft' });
    expect(await getArticleBySlug(draft.slug)).toBeNull();
    expect(draft.authors?.every(author => author.article_id === draft.id)).toBe(true);
  });

  it('renders Uzbek and Cyrillic PDF text without WinAnsi encoding errors', async () => {
    const article = { ...journalStore.articles[0], title_en: undefined, title_uz: 'O‘zbekcha maqola — Научная статья', abstract_en: undefined, abstract_uz: 'Ilmiy tadqiqot: исследование va o‘rganish.' };
    const bytes = await generateArticleTitlePagePdf(article, await getJournalSettings());
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-');
  });

  it('restores saved records across store instances', () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), 'agm-store-test-'));
    const originalVitest = process.env.VITEST;
    const originalDirectory = process.env.JOURNAL_DATA_DIR;
    try {
      delete process.env.VITEST;
      process.env.JOURNAL_DATA_DIR = directory;
      const store = new JournalStore();
      store.settings.journal_name = 'Persistence regression';
      store.contactMessages.push({ id: 'test-message', name: 'Author', email: 'qa@example.com', message: 'Saved inquiry', created_at: new Date().toISOString() });
      store.persist();
      const restored = new JournalStore(); restored.refresh();
      expect(restored.settings.journal_name).toBe('Persistence regression');
      expect(restored.contactMessages[0].id).toBe('test-message');
    } finally {
      process.env.VITEST = originalVitest;
      if (originalDirectory === undefined) delete process.env.JOURNAL_DATA_DIR;
      else process.env.JOURNAL_DATA_DIR = originalDirectory;
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('rejects forged or expired admin sessions', () => {
    const original = process.env.ADMIN_PASSWORD;
    try {
      process.env.ADMIN_PASSWORD = 'regression-only-password';
      const valid = createAdminSession();
      expect(validAdminSession(valid)).toBe(true);
      expect(validAdminSession(valid + 'x')).toBe(false);
      expect(validAdminSession('1.invalid')).toBe(false);
      expect(validAdminSession()).toBe(false);
    } finally {
      if (original === undefined) delete process.env.ADMIN_PASSWORD;
      else process.env.ADMIN_PASSWORD = original;
    }
  });
});
