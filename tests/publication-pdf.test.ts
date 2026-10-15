import { describe, expect, it } from 'vitest';
import { PDFDocument, degrees } from 'pdf-lib';
import { assemblePublicationPdf, embedJournalFonts, generateCertificatePdf, generateIssueTocPdf, generateArticleTitlePagePdf, wrapPublicationText } from '@/lib/pdf/generator';
import { journalStore } from '@/lib/data-store';

describe('Publication PDF layout', () => {
  it('wraps long Unicode URLs and respects explicit paragraphs without losing characters', async () => {
    const doc = await PDFDocument.create();
    const { fontRegular } = await embedJournalFonts(doc);
    const input = 'https://example.org/' + 'тадқиқот'.repeat(60);
    const lines = wrapPublicationText(input, 300, 10, fontRegular);
    expect(lines.join('')).toBe(input);
    expect(lines.every(line => fontRegular.widthOfTextAtSize(line, 10) <= 300)).toBe(true);
    expect(wrapPublicationText('First\nSecond', 300, 10, fontRegular)).toEqual(['First', 'Second']);
  });

  it('frames every original manuscript page, including crop and rotated landscape pages', async () => {
    const original = await PDFDocument.create();
    original.addPage([700, 900]).drawText('Scientific formula: E = mc2');
    const rotated = original.addPage([900, 600]);
    rotated.setCropBox(20, 10, 800, 500);
    rotated.setRotation(degrees(90));
    rotated.drawText('Landscape scientific figure', { x: 30, y: 100 });
    const article = journalStore.articles[0];
    const cover = await PDFDocument.load(await generateArticleTitlePagePdf(article, journalStore.settings));
    const assembled = await PDFDocument.load(await assemblePublicationPdf(article, journalStore.settings, await original.save()));
    expect(assembled.getPageCount()).toBe(cover.getPageCount() + 2);
    for (const page of assembled.getPages()) {
      expect(page.getWidth()).toBeCloseTo(595.28);
      expect(page.getHeight()).toBeCloseTo(841.89);
    }
    expect(assembled.getTitle()).toBe(cover.getTitle());
  }, 20000);

  it('paginates large issue contents instead of clipping article entries', async () => {
    const articles = Array.from({ length: 50 }, (_, index) => ({ ...journalStore.articles[0], title_uz: `Research ${index + 1}: ` + 'Scientific methods '.repeat(7) }));
    const doc = await PDFDocument.load(await generateIssueTocPdf(journalStore.issues[0], articles));
    expect(doc.getPageCount()).toBeGreaterThan(4);
  }, 20000);

  it('keeps an ordinary author certificate on one landscape A4 sheet and rejects revocation', async () => {
    const cert = { ...journalStore.certificates[0], status: 'valid' as const, author_name: 'Dr. Zaynab Abdullayeva', article_title: 'Sustainable methods in interdisciplinary research', author_affiliation: 'International Research University' };
    const doc = await PDFDocument.load(await generateCertificatePdf(cert, 'https://example.org/verify/test', journalStore.settings));
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getPage(0).getWidth()).toBeCloseTo(841.89);
    expect(doc.getPage(0).getHeight()).toBeCloseTo(595.28);
    await expect(generateCertificatePdf({ ...cert, status: 'revoked' }, 'https://example.org')).rejects.toThrow('Certificate revoked');
    const overflow = await PDFDocument.load(await generateCertificatePdf({ ...cert, article_title: 'Very long scientific title '.repeat(150) }, 'https://example.org/verify/test'));
    expect(overflow.getPageCount()).toBeGreaterThan(1);
  }, 20000);
  it('preserves long multilingual abstracts across pages', async () => {
    const article = {
      ...journalStore.articles[0],
      original_language: 'ru' as const,
      title_ru: 'Научная статья: международное исследование',
      abstract_ru: 'Исследование научных методов и результатов. '.repeat(200),
      keywords_ru: ['исследование', 'наука'],
    };
    const doc = await PDFDocument.load(await generateArticleTitlePagePdf(article, journalStore.settings));
    expect(doc.getPageCount()).toBeGreaterThan(1);
    expect(doc.getTitle()).toBe(article.title_ru);
    for (const page of doc.getPages()) {
      expect(page.getWidth()).toBeCloseTo(595.28);
      expect(page.getHeight()).toBeCloseTo(841.89);
    }
  }, 20000);

  it('does not invent volume numbers or pages when unassigned', async () => {
    const article = { ...journalStore.articles[0], issue: undefined, issue_id: undefined, page_first: undefined, page_last: undefined };
    const doc = await PDFDocument.load(await generateArticleTitlePagePdf(article, journalStore.settings));
    expect(doc.getSubject()).toBe('Belgilanmagan');
  });
});
