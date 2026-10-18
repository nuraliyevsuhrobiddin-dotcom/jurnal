import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { journalStore } from '@/lib/data-store';
import { GET } from '@/app/api/issues/[id]/pdf/route';
import { readArticlePdf } from '@/lib/pdf/storage';

vi.mock('@/lib/request-limit', () => ({ protectRequest: vi.fn().mockResolvedValue(null) }));
vi.mock('@/lib/pdf/storage', () => ({ readArticlePdf: vi.fn() }));
const request = () => new NextRequest('http://localhost/api/issues/test/pdf');

describe('Issue PDF download route', () => {
  const originalArticles = [...journalStore.articles];
  beforeEach(() => {
    vi.mocked(readArticlePdf).mockClear();
    const issue = journalStore.issues[0];
    const template = originalArticles.find(a => a.status === 'published' && a.issue_id === issue.id)!;
    journalStore.articles = Array.from({ length: 25 }, (_, i) => ({ ...template, id: `collection-${i}` }));
  });
  afterEach(() => { journalStore.articles = [...originalArticles]; });
  it('blocks downloading below 25 published articles', async () => {
    journalStore.articles.pop();
    const response = await GET(request(), { params: Promise.resolve({ id: journalStore.issues[0].id }) });
    expect(response.status).toBe(409);
    expect(await response.text()).toContain('24/25');
    expect(readArticlePdf).not.toHaveBeenCalled();
  });
  it.each([25, 26])('returns a downloadable, readable PDF for %i articles', async (count) => {
    if (count === 26) journalStore.articles.push({ ...journalStore.articles[0], id: 'collection-25' });
    const source = await PDFDocument.create(); source.addPage();
    vi.mocked(readArticlePdf).mockResolvedValue(await source.save());
    const issue = journalStore.issues[0];
    const response = await GET(request(), { params: Promise.resolve({ id: issue.id }) });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('content-disposition')).toContain('attachment;');
    expect(response.headers.get('cache-control')).toBe('no-store');
    const pdf = await PDFDocument.load(await response.arrayBuffer());
    const papers = journalStore.articles.filter(a => a.status === 'published' && a.issue_id === issue.id);
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(2 + papers.length);
  });
  it('blocks a subject collection below 25 even when the whole issue has 25', async () => {
    journalStore.articles[0] = { ...journalStore.articles[0], subject_id: 'social-sciences' };
    const response = await GET(new NextRequest('http://localhost/api/issues/test/pdf?subject=social-sciences'), { params: Promise.resolve({ id: journalStore.issues[0].id }) });
    expect(response.status).toBe(409);
  });
  it('excludes drafts and articles from other issues from the threshold', async () => {
    journalStore.articles[0] = { ...journalStore.articles[0], status: 'draft' };
    journalStore.articles[1] = { ...journalStore.articles[1], issue_id: 'another-issue' };
    const response = await GET(request(), { params: Promise.resolve({ id: journalStore.issues[0].id }) });
    expect(response.status).toBe(409);
    expect(await response.text()).toContain('23/25');
    expect(readArticlePdf).not.toHaveBeenCalled();
  });
  it('downloads a subject collection at exactly 25 articles', async () => {
    journalStore.articles = journalStore.articles.map(article => ({ ...article, subject_id: 'social-sciences' }));
    const source = await PDFDocument.create(); source.addPage();
    vi.mocked(readArticlePdf).mockResolvedValue(await source.save());
    const response = await GET(new NextRequest('http://localhost/api/issues/test/pdf?subject=social-sciences'), { params: Promise.resolve({ id: journalStore.issues[0].id }) });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-disposition')).toContain('social-sciences.pdf');
  });
  it('returns 409 for missing published PDF and 404 for malformed issue IDs', async () => {
    vi.mocked(readArticlePdf).mockResolvedValue(null);
    const response = await GET(request(), { params: Promise.resolve({ id: journalStore.issues[0].id }) });
    expect(response.status).toBe(409);
    expect(await response.text()).toContain('missing');
    expect((await GET(request(), { params: Promise.resolve({ id: '../invalid' }) })).status).toBe(404);
  });
});
