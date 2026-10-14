import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { generateArticleTitlePagePdf } from '@/lib/pdf/generator';
import { journalStore } from '@/lib/data-store';

describe('Publication PDF layout', () => {
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
  });

  it('does not invent volume numbers or pages when unassigned', async () => {
    const article = { ...journalStore.articles[0], issue: undefined, issue_id: undefined, page_first: undefined, page_last: undefined };
    const doc = await PDFDocument.load(await generateArticleTitlePagePdf(article, journalStore.settings));
    expect(doc.getSubject()).toBe('Belgilanmagan');
  });
});
