import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { readFile } from 'node:fs/promises';
import { readUploadForm, UploadFormError } from '@/lib/upload-form';
import { BodyLimitError } from '@/lib/bounded-body';
import { MAX_UPLOAD_BODY_BYTES } from '@/lib/upload-limits';
import { articleSchema } from '@/lib/article-validation';
import { journalStore } from '@/lib/data-store';
import { POST as parseDocx } from '@/app/api/admin/docx/parse/route';
import { POST as uploadPdf } from '@/app/api/admin/articles/[id]/pdf/route';

vi.mock('@/lib/admin-access', () => ({ adminAccess: vi.fn(async () => null) }));
vi.mock('@/lib/db', () => ({ getArticleById: vi.fn(async () => ({ ...journalStore.articles[0], status: 'draft' })) }));

describe('Bounded upload parsing', () => {
  it('rejects an oversized stream without trusting Content-Length', async () => {
    const body = new ReadableStream({ start(controller) {
      controller.enqueue(new Uint8Array(MAX_UPLOAD_BODY_BYTES));
      controller.enqueue(new Uint8Array(1));
      controller.close();
    } });
    const request = new Request('http://localhost/upload', { method: 'POST', body, duplex: 'half' } as RequestInit);
    await expect(readUploadForm(request)).rejects.toBeInstanceOf(BodyLimitError);
  });

  it('distinguishes malformed form data from a server failure', async () => {
    await expect(readUploadForm(new Request('http://localhost/upload', { method: 'POST', body: 'invalid' }))).rejects.toBeInstanceOf(UploadFormError);
    const response = await uploadPdf(new NextRequest('http://localhost/upload', { method: 'POST', body: 'invalid' }), { params: Promise.resolve({ id: journalStore.articles[0].id }) });
    expect(response.status).toBe(400);
  });

  it('returns 413 before attempting to parse an oversized admin upload', async () => {
    const response = await uploadPdf(new NextRequest('http://localhost/upload', { method: 'POST', body: 'small', headers: { 'content-length': String(MAX_UPLOAD_BODY_BYTES + 1) } }), { params: Promise.resolve({ id: journalStore.articles[0].id }) });
    expect(response.status).toBe(413);
  });

  it('rejects a renamed ZIP instead of parsing it as a Word document', async () => {
    const form = new FormData();
    form.set('file', new File([await readFile('tests/fixtures/ordinary.zip')], 'manuscript.docx'));
    const response = await parseDocx(new NextRequest('http://localhost/parse', { method: 'POST', body: form }));
    expect(response.status).toBe(400);
  });

  it('still parses a real Word manuscript', async () => {
    const form = new FormData();
    form.set('file', new File([await readFile('tests/fixtures/manuscript.docx')], 'manuscript.docx'));
    const response = await parseDocx(new NextRequest('http://localhost/parse', { method: 'POST', body: form }));
    expect(response.status).toBe(200);
    expect((await response.json()).wordCount).toBeGreaterThan(0);
  });
});

describe('Article metadata validation', () => {
  it.each(['title_uz', 'abstract_uz', 'license'])('rejects whitespace-only %s', field => {
    expect(articleSchema.safeParse({ ...journalStore.articles[0], [field]: ' '.repeat(30) }).success).toBe(false);
  });
  it('rejects blank keywords and author names', () => {
    const article = journalStore.articles[0];
    expect(articleSchema.safeParse({ ...article, keywords_uz: ['  '] }).success).toBe(false);
    expect(articleSchema.safeParse({ ...article, authors: [{ ...article.authors![0], full_name: '   ' }] }).success).toBe(false);
  });
  it('normalizes surrounding spaces without changing scientific text', () => {
    const article = journalStore.articles[0];
    const result = articleSchema.parse({ ...article, title_uz: `  ${article.title_uz}  `, keywords_uz: ['  research  '] });
    expect(result.title_uz).toBe(article.title_uz);
    expect(result.keywords_uz).toEqual(['research']);
  });
});
