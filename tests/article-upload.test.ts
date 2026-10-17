import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { POST } from '@/app/api/admin/articles/[id]/pdf/route';
import { journalStore } from '@/lib/data-store';
import { saveManuscript, readManuscript } from '@/lib/manuscript-storage';
import { saveArticlePdf } from '@/lib/pdf/storage';
import { updateArticle } from '@/lib/db';

vi.mock('@/lib/admin-access', () => ({ adminAccess: vi.fn(async () => null) }));
vi.mock('@/lib/db', () => ({
  getArticleById: vi.fn(async () => ({ ...journalStore.articles[0], page_first: 7 })),
  getJournalSettings: vi.fn(async () => journalStore.settings),
  updateArticle: vi.fn(async () => journalStore.articles[0]),
}));
vi.mock('@/lib/manuscript-storage', () => ({ saveManuscript: vi.fn(), readManuscript: vi.fn() }));
vi.mock('@/lib/pdf/storage', () => ({ saveArticlePdf: vi.fn(), readArticlePdf: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe('Article PDF upload', () => {
  it('retains an explicitly uploaded source even when use_manuscript is also sent', async () => {
    const source = await PDFDocument.create();
    source.addPage().drawText('Full manuscript first page');
    source.addPage().drawText('Full manuscript second page');
    const bytes = await source.save();
    vi.mocked(saveManuscript).mockResolvedValue({ id: 'new-source', name: 'research.pdf', extension: 'pdf', contentType: 'application/pdf', size: bytes.length });
    const form = new FormData();
    form.set('file', new File([Buffer.from(bytes)], 'research.pdf', { type: 'application/pdf' }));
    form.set('use_manuscript', 'true');
    const response = await POST(new NextRequest('http://localhost/api/admin/articles/test/pdf', { method: 'POST', body: form }), { params: Promise.resolve({ id: journalStore.articles[0].id }) });
    expect(response.status).toBe(200);
    expect(readManuscript).not.toHaveBeenCalled();
    expect(saveManuscript).toHaveBeenCalledOnce();
    const saved = vi.mocked(saveArticlePdf).mock.calls[0][1];
    expect((await PDFDocument.load(saved)).getPageCount()).toBe(2);
    expect(updateArticle).toHaveBeenCalledWith(journalStore.articles[0].id, expect.objectContaining({ page_first: 7, page_last: 8, manuscript_file_url: '/api/admin/manuscripts/new-source' }));
    expect(await response.json()).toMatchObject({ page_count: 2, page_first: 7, page_last: 8 });
  });

  it('rejects a prepared PDF before changing stored files or article metadata', async () => {
    const source = await PDFDocument.create();
    source.addPage().drawText('Previously published manuscript');
    source.setKeywords(['AGM_FULL_ARTICLE_V2']);
    const form = new FormData();
    form.set('file', new File([Buffer.from(await source.save())], 'published.pdf', { type: 'application/pdf' }));
    const response = await POST(new NextRequest('http://localhost/api/admin/articles/test/pdf', { method: 'POST', body: form }), { params: Promise.resolve({ id: journalStore.articles[0].id }) });
    expect(response.status).toBe(400);
    expect(saveManuscript).not.toHaveBeenCalled();
    expect(saveArticlePdf).not.toHaveBeenCalled();
    expect(updateArticle).not.toHaveBeenCalled();
  });
});
