import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { journalStore } from '@/lib/data-store';
import { GET } from '@/app/api/issues/[id]/pdf/route';
import { readArticlePdf } from '@/lib/pdf/storage';
import { resolveSubjectId } from '@/lib/subjects';

vi.mock('@/lib/pdf/storage', () => ({ readArticlePdf: vi.fn() }));
const request = () => new NextRequest('http://localhost/api/issues/test/pdf');

describe('Issue PDF download route', () => {
  it('returns a downloadable, readable PDF through a response stream', async () => {
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
    expect(pdf.getPageCount()).toBe(2 + papers.length + new Set(papers.map(resolveSubjectId)).size);
  });
  it('returns 409 for missing published PDF and 404 for malformed issue IDs', async () => {
    vi.mocked(readArticlePdf).mockResolvedValue(null);
    const response = await GET(request(), { params: Promise.resolve({ id: journalStore.issues[0].id }) });
    expect(response.status).toBe(409);
    expect(await response.text()).toContain('missing');
    expect((await GET(request(), { params: Promise.resolve({ id: '../invalid' }) })).status).toBe(404);
  });
});
