import { describe, expect, it } from 'vitest';
import { PDFDocument, PDFDict, PDFName } from 'pdf-lib';
import { assemblePublicationPdf, ensurePublicationLayout, generatePublicationCoverPdf } from '@/lib/pdf/generator';
import { publicationBodyPageCount } from '@/lib/pdf/manuscript-conversion';
import { PUBLICATION_DESIGN } from '@/lib/pdf/publication-design';
import { journalStore } from '@/lib/data-store';

const settings = journalStore.settings;
const article = { ...journalStore.articles[0], issue: journalStore.issues[0], page_first: 21, page_last: 22 };

describe('Atlas publication design', () => {
  it('brands source PDF pages without duplicating the manuscript metadata', async () => {
    const source = await PDFDocument.create();
    source.addPage().drawText('First original page');
    source.addPage().drawText('Second original page');
    const bytes = await assemblePublicationPdf(article, settings, await source.save());
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(2);
    expect(doc.getKeywords()).toContain(PUBLICATION_DESIGN);
    expect(doc.getKeywords()).toContain('AGM_COVER_PAGES:0');
    expect(publicationBodyPageCount(doc)).toBe(2);
    const images = doc.getPage(0).node.Resources()?.lookup(PDFName.of('XObject'), PDFDict);
    expect(images?.keys().length).toBeGreaterThanOrEqual(1);
    const body = doc.getPage(doc.getPageCount() - 1);
    expect(body.node.Resources()?.lookup(PDFName.of('XObject'), PDFDict).keys().length).toBeGreaterThanOrEqual(2); // Source artwork plus logo.
    expect(await ensurePublicationLayout(article, settings, bytes)).toBe(bytes);
  });

  it('replaces an older Word cover instead of nesting covers or dropping the body', async () => {
    const legacy = await PDFDocument.create();
    legacy.addPage().drawText('OLD METADATA COVER');
    legacy.addPage().drawText('Actual research first page');
    legacy.addPage().drawText('Actual research second page');
    legacy.setKeywords(['AGM_FULL_ARTICLE_V2', 'AGM_BODY_PAGES:2']);
    const updated = await ensurePublicationLayout(article, settings, await legacy.save());
    const doc = await PDFDocument.load(updated);
    expect(doc.getPageCount()).toBe(3);
    expect(publicationBodyPageCount(doc)).toBe(2);
    expect(await ensurePublicationLayout(article, settings, updated)).toBe(updated);
  });

  it('refreshes final publication metadata after a draft file was prepared, without accumulating covers', async () => {
    const source = await PDFDocument.create(); source.addPage().drawText('Research body');
    const draft = { ...article, publication_date: undefined };
    const prepared = await assemblePublicationPdf(draft, settings, await source.save());
    const changed = { ...article, title_uz: 'Yakuniy tahrirlangan maqola sarlavhasi', publication_date: '2026-10-25' };
    const updated = await ensurePublicationLayout(changed, settings, prepared);
    const doc = await PDFDocument.load(updated);
    expect(doc.getTitle()).toBe(changed.title_uz);
    expect(publicationBodyPageCount(doc)).toBe(1);
    expect(doc.getPageCount()).toBe(1);
    expect(await ensurePublicationLayout(changed, settings, updated)).toBe(updated);
    expect(await ensurePublicationLayout({ ...changed, views_count: 100 }, settings, updated)).toBe(updated);
  });

  it.each(['uz', 'ru', 'en'] as const)('paginates long %s metadata and preserves the full title', async language => {
    const title = (language === 'ru' ? 'Научное исследование и международное сотрудничество. ' : 'Ilmiy tadqiqot va xalqaro hamkorlik. ').repeat(14);
    const candidate = { ...article, original_language: language, [`title_${language}`]: title, [`abstract_${language}`]: 'Research methods, evidence and limitations. '.repeat(150) };
    const doc = await PDFDocument.load(await generatePublicationCoverPdf(candidate, settings));
    expect(doc.getTitle()).toBe(title);
    expect(doc.getPageCount()).toBeGreaterThan(2);
    expect(doc.getPages().every(page => page.getWidth() === 595.28 && page.getHeight() === 841.89)).toBe(true);
  });
});
