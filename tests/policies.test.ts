import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { getPolicyDocument, getPolicyDocuments, getPolicyHash, getHandbookHash } from '@/lib/policies';
import { policyIds } from '@/types/policies';
import { generatePolicyPdf, wrapPolicyText } from '@/lib/pdf/policy-generator';
import { embedJournalFonts } from '@/lib/pdf/generator';
import { manuscriptSubmissionSchema } from '@/lib/submission-validation';
import { articleSchema, articleUpdateSchema, articleClearFields } from '@/lib/article-validation';
import { isValidIssn } from '@/lib/identifiers';
import type { Article, JournalSettings } from '@/types/journal';
import { normalizeRemoteArticle } from '@/lib/remote-db';
import { readFile } from 'node:fs/promises';
import { isDocxArchive } from '@/lib/docx-validation';

const settings: JournalSettings = { journal_name: 'AGM Journal', publisher: 'AGM Publishing', tagline: 'Research journal', established_year: 2026, contact_email: 'editorial@example.org' };

describe('Localized policy publications', () => {
  for (const lang of ['uz', 'en', 'ru'] as const) {
    it(`${lang}: all sixteen complete documents expand settings and preserve version identity`, () => {
      const documents = getPolicyDocuments(lang, settings);
      expect(documents.map(doc => doc.id)).toEqual([...policyIds]);
      for (const doc of documents) {
        expect(doc.sections.length).toBeGreaterThanOrEqual(7);
        expect(new Set(doc.sections.map(section => section.id)).size).toBe(doc.sections.length);
        expect(JSON.stringify(doc)).not.toContain('{{');
        expect(doc.sections.flatMap(section => [...section.paragraphs, ...(section.items || [])]).join(' ').split(/\s+/).length).toBeGreaterThan(250);
        expect(doc.sources.every(source => source.url.startsWith('https://'))).toBe(true);
        expect(getPolicyHash(doc, lang)).toMatch(/^[a-f0-9]{64}$/);
      }
      expect(getHandbookHash(documents, lang)).toBe(getHandbookHash(getPolicyDocuments(lang, settings), lang));
      const changed = { ...documents[0], summary: 'Changed editorial policy' };
      expect(getPolicyHash(changed, lang)).not.toBe(getPolicyHash(documents[0], lang));
    });
    it(`${lang}: printable PDF preserves Unicode and paginates the complete guidelines`, async () => {
      const doc = getPolicyDocument('guidelines', lang, settings);
      const bytes = await generatePolicyPdf({ documents: [doc], settings, lang, title: doc.title, verificationUrl: 'https://example.org/verify', hash: getPolicyHash(doc, lang) });
      const pdf = await PDFDocument.load(bytes);
      expect(pdf.getTitle()).toBe(doc.title);
      expect(pdf.getPageCount()).toBeGreaterThanOrEqual(3);
      for (const page of pdf.getPages()) { expect(page.getWidth()).toBeCloseTo(595.28); expect(page.getHeight()).toBeCloseTo(841.89); }
    }, 30000);
  }
  it('handbook includes every chapter and a separate table of contents', async () => {
    const documents = getPolicyDocuments('uz', settings);
    const bytes = await generatePolicyPdf({ documents, settings, lang: 'uz', title: 'Jurnal nizomi va siyosatlari', verificationUrl: 'https://example.org/verify', hash: getHandbookHash(documents, 'uz') });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(18);
  }, 30000);
  it('wraps long URLs and Cyrillic without dropping characters or overflowing', async () => {
    const pdf = await PDFDocument.create();
    const { fontRegular } = await embedJournalFonts(pdf);
    const token = 'https://example.org/' + 'исследование'.repeat(40);
    const lines = wrapPolicyText(token, fontRegular, 10, 200);
    expect(lines.join('')).toBe(token);
    expect(lines.every(line => fontRegular.widthOfTextAtSize(line, 10) <= 200)).toBe(true);
  });
});

describe('Editorial input boundaries', () => {
  it('accepts a Word archive and refuses arbitrary ZIPs, incomplete files and excessive expansion', async () => {
    const word = await readFile('tests/fixtures/manuscript.docx');
    expect(isDocxArchive(word)).toBe(true);
    expect(isDocxArchive(await readFile('tests/fixtures/ordinary.zip'))).toBe(false);
    expect(isDocxArchive(word.subarray(0, 50))).toBe(false);
    const large = Buffer.from(word);
    const entry = large.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    large.writeUInt32LE(81 * 1024 * 1024, entry + 24);
    expect(isDocxArchive(large)).toBe(false);
  });
  const submission = { title: 'Research manuscript', abstract: 'An original scientific research abstract containing sufficient detail about the methods and results.', keywords: 'research, methods', author_name: 'Test Author', email: 'author@example.org', affiliation: 'Research University', country: 'Uzbekistan', lang: 'en', consent: 'true', original: 'true', reviewed: 'true' };
  it('requires metadata, author consent and originality declarations', () => {
    expect(manuscriptSubmissionSchema.safeParse(submission).success).toBe(true);
    for (const invalid of [{ consent: 'false' }, { original: '' }, { email: 'invalid' }, { abstract: 'short' }, { lang: 'xx' }]) expect(manuscriptSubmissionSchema.safeParse({ ...submission, ...invalid }).success).toBe(false);
  });
  it('blocks protected article fields and incoherent page ranges', () => {
    expect(articleUpdateSchema.safeParse({ id: 'replace-id' }).success).toBe(false);
    expect(articleUpdateSchema.safeParse({ manuscript_file_url: '/public/private.pdf' }).success).toBe(false);
    expect(articleClearFields.safeParse(['manuscript_file_url']).success).toBe(false);
    const article = { title_uz: 'Valid title', abstract_uz: submission.abstract, keywords_uz: ['research'], authors: [{ id: 'a', article_id: '', full_name: 'Test Author', affiliation: 'University' }], page_first: 12, page_last: 1 };
    expect(articleSchema.safeParse(article).success).toBe(false);
    const fromSql = { ...article, page_first: null, page_last: null, title_en: null, publication_date: null, authors: [{ ...article.authors[0], email: null, orcid: null }] } as unknown as Article;
    expect(articleSchema.safeParse(normalizeRemoteArticle(fromSql)).success).toBe(true);
  });
  it('suppresses invalid sample ISSNs without inventing registration identifiers', () => {
    expect(isValidIssn('0317-8471')).toBe(true);
    expect(isValidIssn('2959-5678')).toBe(false);
    expect(isValidIssn('2959-1234')).toBe(false);
    expect(isValidIssn(undefined)).toBe(false);
  });
});
