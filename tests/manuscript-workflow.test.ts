import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { POST } from '@/app/api/submissions/route';
import { GET as template } from '@/app/api/submissions/template/route';
import { createArticle } from '@/lib/db';
import { saveManuscript } from '@/lib/manuscript-storage';
import { isDocxArchive } from '@/lib/docx-validation';
import { extractManuscriptMetadata, metadataReport } from '@/lib/manuscript-metadata';
import { checkManuscriptLanguage } from '@/lib/manuscript-language';
import { queueNotification } from '@/lib/notifications';
import { applyManuscriptSuggestions, clearAutomaticFields, editManuscriptField, emptyManuscriptFields, type TrackedFields } from '@/lib/manuscript-fields';

vi.mock('next/server', async importOriginal => ({ ...await importOriginal<typeof import('next/server')>(), after: vi.fn() }));
vi.mock('@/lib/request-limit', () => ({ protectRequest: vi.fn(async () => null) }));
vi.mock('@/lib/db', () => ({ createArticle: vi.fn(async () => ({ id: 'article-id' })) }));
vi.mock('@/lib/notifications', () => ({ queueNotification: vi.fn(async () => ({})), deliverNotification: vi.fn() }));
vi.mock('@/lib/manuscript-storage', () => ({ saveManuscript: vi.fn(async () => ({ id: 'manuscript-id' })), removeManuscript: vi.fn() }));

const english = 'This study examines the effects of climate on agriculture. The data were analysed using a comparative method and the results showed significant differences between the regions.';
const submission = { title: 'Climate and agriculture research', abstract: english, keywords: 'climate, agriculture', author_name: 'Jane Smith', email: 'jane@example.org', affiliation: 'Research University', country: 'United Kingdom', lang: 'en', consent: 'true', original: 'true', reviewed: 'true' };

beforeEach(() => { vi.clearAllMocks(); });

describe('Replacing manuscript files', () => {
  it('replaces automatic fields and preserves manual edits, including an intentionally empty field', () => {
    const initial: TrackedFields = { values: { ...emptyManuscriptFields }, automatic: {}, edited: {} };
    let fields = applyManuscriptSuggestions(initial, { title: 'First title', abstract: 'First abstract', keywords: 'old keywords', email: 'old@example.org' });
    fields = editManuscriptField(fields, 'title', 'My corrected title');
    fields = editManuscriptField(fields, 'email', '');
    fields = clearAutomaticFields(fields);
    expect(fields.values.abstract).toBe('');
    fields = applyManuscriptSuggestions(fields, { title: 'Second title', abstract: 'Second abstract', keywords: 'new keywords', email: 'new@example.org' });
    expect(fields.values).toMatchObject({ title: 'My corrected title', abstract: 'Second abstract', keywords: 'new keywords', email: '' });
  });
});

describe('Word headings and language checks', () => {
  it('preserves abstract sentences starting with Results or Methods', () => {
    const metadata = extractManuscriptMetadata('Article title\nAbstract\nMethods were applied to compare the study groups.\nResults showed a significant effect.\nKeywords: analysis; groups\n1. Introduction\nFull text');
    expect(metadata.abstract).toContain('Results showed a significant effect.');
    expect(metadata.abstract).not.toContain('Full text');
  });
  it('does not treat Abstract algebra as an abstract heading', () => {
    expect(extractManuscriptMetadata('Abstract algebra in education\nIntroduction\nFull text').abstract).toBeUndefined();
  });
  it('keeps labelled sections in structured abstracts', () => {
    const metadata = extractManuscriptMetadata('Article title\nAbstract\nBackground: Research context.\nMethods: We compared groups.\nResults: The effect was significant.\nConclusion: The method helps.\nKeywords: groups; research\nIntroduction\nMain text');
    expect(metadata.abstract).toContain('Methods: We compared groups.');
    expect(metadata.abstract).toContain('Conclusion: The method helps.');
    expect(metadata.abstract).not.toContain('Main text');
  });
  it('reports missing fields and supports summary and wrapped keywords', () => {
    const metadata = extractManuscriptMetadata('Article title\nSummary\nSome research findings.\nIndex terms: research; science;\nmethods; data\n2. Methods\nBody text');
    expect(metadata.keywords).toBe('research, science, methods, data');
    expect(metadataReport(metadata).missing).toContain('author_name');
    expect(metadataReport(extractManuscriptMetadata('')).found).toEqual([]);
  });
  it('distinguishes likely English, likely non-English and uncertain short text', () => {
    expect(checkManuscriptLanguage(english).status).toBe('english');
    expect(checkManuscriptLanguage('va uchun bilan ushbu tadqiqot natijalar va maqola orqali bu bir ham '.repeat(4)).status).toBe('non_english');
    expect(checkManuscriptLanguage('A short title').status).toBe('uncertain');
  });
  it('provides a readable Word template with metadata that round trips', async () => {
    const response = await template();
    const buffer = Buffer.from(await response.arrayBuffer());
    expect(isDocxArchive(buffer)).toBe(true);
    expect(response.headers.get('content-disposition')).toContain('.docx');
    const text = (await mammoth.extractRawText({ buffer })).value;
    const report = metadataReport(extractManuscriptMetadata(text));
    expect(report.missing).toEqual([]);
    expect(text).toContain('Coauthors:');
  });
});

async function request(overrides: Record<string, string> = {}, useWord = false) {
  const form = new FormData();
  for (const [key, value] of Object.entries({ ...submission, ...overrides })) form.set(key, value);
  if (useWord) form.set('file', new File([await (await template()).arrayBuffer()], 'manuscript.docx'));
  else {
    const pdf = await PDFDocument.create(); pdf.addPage();
    form.set('file', new File([new Uint8Array(await pdf.save())], 'manuscript.pdf'));
  }
  return POST(new NextRequest('http://localhost/api/submissions', { method: 'POST', body: form }));
}

describe('Submission storage and verification', () => {
  it('saves all authors in order and flags PDF language for editorial review', async () => {
    const response = await request({ coauthors: JSON.stringify([{ full_name: 'John Smith', email: '', affiliation: 'Other University', country: 'Canada' }]) });
    expect(response.status).toBe(201);
    const saved = vi.mocked(createArticle).mock.calls[0][0];
    expect(saved.authors).toHaveLength(2);
    expect(saved.authors![0]).toMatchObject({ full_name: 'Jane Smith', is_corresponding: true, order_index: 1 });
    expect(saved.authors![1]).toMatchObject({ full_name: 'John Smith', is_corresponding: false, order_index: 2 });
    expect(saved.submission_notes).toContain('PDF requires manual editorial language review');
  });
  it('checks the Word document independently of client-side metadata extraction', async () => {
    expect((await request({}, true)).status).toBe(201);
    expect(vi.mocked(createArticle).mock.calls[0][0].submission_notes).toContain('Manuscript language: english');
  });
  it('returns a private tracking link so receipt delivery is not the only way to follow a submission', async () => {
    const response = await request();
    expect(response.status).toBe(201);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toMatchObject({ success: true, receipt_queued: true, tracking_url: expect.stringMatching(/^\/track\//) });
  });

  it('keeps a saved submission and its tracking link when the email queue fails', async () => {
    vi.mocked(queueNotification).mockRejectedValueOnce(new Error('Synthetic outbox failure'));
    const response = await request();
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ success: true, receipt_queued: false, tracking_url: expect.stringMatching(/^\/track\//) });
    expect(createArticle).toHaveBeenCalledTimes(1);
  });
  it('rejects non-English Word body even with English metadata', async () => {
    const zip = await JSZip.loadAsync(await (await template()).arrayBuffer());
    zip.file('word/document.xml', `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${'va uchun bilan ushbu tadqiqot natijalar va maqola orqali bu bir ham '.repeat(12)}</w:t></w:r></w:p></w:body></w:document>`);
    const form = new FormData();
    for (const [key, value] of Object.entries(submission)) form.set(key, value);
    form.set('file', new File([new Uint8Array(await zip.generateAsync({ type: 'nodebuffer' }))], 'non-english.docx'));
    const response = await POST(new NextRequest('http://localhost/api/submissions', { method: 'POST', body: form }));
    expect(response.status).toBe(400);
    expect(saveManuscript).not.toHaveBeenCalled();
  });
  it.each<Record<string, string>>([{ reviewed: 'false' }, { coauthors: '{invalid' }, { coauthors: JSON.stringify([{ full_name: 'X' }]) }, { lang: 'uz' }])('rejects invalid or unreviewed data before saving', async overrides => {
    expect((await request(overrides)).status).toBe(400);
    expect(saveManuscript).not.toHaveBeenCalled();
  });
  it('rejects non-English metadata even when lang is en', async () => {
    expect((await request({ abstract: 'va uchun bilan ushbu tadqiqot natijalar va maqola orqali bu bir ham '.repeat(5) })).status).toBe(400);
    expect(createArticle).not.toHaveBeenCalled();
  });
  it('rejects unchanged template metadata instead of saving example author details', async () => {
    const buffer = Buffer.from(await (await template()).arrayBuffer());
    const metadata = extractManuscriptMetadata((await mammoth.extractRawText({ buffer })).value);
    expect((await request(Object.fromEntries(Object.entries(metadata).filter(([, value]) => typeof value === 'string')) as Record<string, string>, true)).status).toBe(400);
    expect(createArticle).not.toHaveBeenCalled();
  });
});
