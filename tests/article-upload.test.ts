import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { POST } from '@/app/api/admin/articles/[id]/pdf/route';
import { journalStore } from '@/lib/data-store';
import { saveManuscript, readManuscript, removeManuscript } from '@/lib/manuscript-storage';
import { saveArticlePdf, removeArticlePdf } from '@/lib/pdf/storage';
import { updateArticle } from '@/lib/db';
import { PublicationError } from '@/lib/publication-ready';

vi.mock('@/lib/admin-access', () => ({ adminAccess: vi.fn(async () => null) }));
vi.mock('@/lib/db', () => ({
  getArticleById: vi.fn(async () => ({ ...journalStore.articles[0], status: 'draft', page_first: 7 })),
  getJournalSettings: vi.fn(async () => journalStore.settings),
  updateArticle: vi.fn(async () => journalStore.articles[0]),
}));
vi.mock('@/lib/manuscript-storage', () => ({ saveManuscript: vi.fn(), readManuscript: vi.fn(), removeManuscript: vi.fn() }));
vi.mock('@/lib/pdf/storage', () => ({ saveArticlePdf: vi.fn(), readArticlePdf: vi.fn(), removeArticlePdf: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe('Article PDF upload', () => {
  it.each([false,true])('preserves immutable files on ambiguous commit failures; definite rejection=%s',async rejected => {
    const doc=await PDFDocument.create(); doc.addPage().drawText('Complete manuscript');
    const source=await doc.save();
    vi.mocked(saveManuscript).mockResolvedValue({id:'new-source',name:'research.pdf',extension:'pdf',contentType:'application/pdf',size:source.length});
    vi.mocked(saveArticlePdf).mockResolvedValue('article/new-version.pdf');
    vi.mocked(updateArticle).mockRejectedValueOnce(rejected ? new PublicationError('Rejected before save') : new Error('Network reply lost'));
    const form=new FormData(); form.set('file',new File([Buffer.from(source)],'research.pdf',{type:'application/pdf'}));
    const response=await POST(new NextRequest('http://localhost/api/admin/articles/test/pdf',{method:'POST',body:form}),{params:Promise.resolve({id:journalStore.articles[0].id})});
    expect(response.status).toBe(rejected?400:500);
    if(rejected){expect(removeArticlePdf).toHaveBeenCalledWith(journalStore.articles[0].id,'article/new-version.pdf');expect(removeManuscript).toHaveBeenCalled();}
    else{expect(removeArticlePdf).not.toHaveBeenCalled();expect(removeManuscript).not.toHaveBeenCalled();}
  });
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
    expect((await PDFDocument.load(saved)).getKeywords()).toContain('AGM_BODY_PAGES:2');
    expect((await PDFDocument.load(saved)).getKeywords()).toContain('AGM_FULL_ARTICLE_V2');
    expect((await PDFDocument.load(saved)).getPage(0).getWidth()).toBeCloseTo(595.28);
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
