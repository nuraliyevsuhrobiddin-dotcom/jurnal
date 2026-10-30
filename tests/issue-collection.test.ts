import { describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import { journalStore } from '@/lib/data-store';
import { buildIssueCollection, generateIssueCoverPdf, orderIssueArticles } from '@/lib/pdf/issue-collection';
import type { Article } from '@/types/journal';

const issue = journalStore.issues[0];
const settings = journalStore.settings;
const makeArticle = (id: string, page: number, status: Article['status'] = 'published'): Article => ({
  ...journalStore.articles[0], id, issue_id: issue.id, page_first: page, status,
});

describe('Complete issue PDF', () => {
  it('includes cover, contents and all published manuscripts in reading order, excluding drafts and other issues', async () => {
    const a = makeArticle('first', 1), b = makeArticle('second', 10);
    const first = await PDFDocument.create(); first.addPage([401, 601]);
    const second = await PDFDocument.create(); second.addPage([402, 602]); second.addPage([403, 603]);
    const pdfs = { first: await first.save(), second: await second.save() };
    const reader = vi.fn(async (id: string) => pdfs[id as keyof typeof pdfs] || null);
    const bytes = await buildIssueCollection({ ...issue, cover_image_url: undefined }, [b, makeArticle('draft', 2, 'draft'), { ...a, id: 'other', issue_id: 'other' }, a], settings, reader);
    const result = await PDFDocument.load(bytes);
    expect(reader.mock.calls.map(([id]) => id)).toEqual(['first', 'second']);
    expect(result.getPageCount()).toBe(5); // Issue cover, contents and three source pages.
    expect(result.getPage(0).getWidth()).toBeCloseTo(595.28);
    expect(result.getPage(2).getWidth()).toBeCloseTo(595.28);
    expect(result.getPage(4).getWidth()).toBeCloseTo(595.28);
    expect(result.getTitle()).toContain(`Issue ${issue.issue_number}`);
  });
  it('fails rather than serving an incomplete collection when a PDF is missing or damaged', async () => {
    const article = makeArticle('missing', 1);
    await expect(buildIssueCollection({ ...issue, cover_image_url: undefined }, [article], settings, async () => null)).rejects.toMatchObject({ status: 409 });
    await expect(buildIssueCollection({ ...issue, cover_image_url: undefined }, [article], settings, async () => new Uint8Array([1, 2, 3]))).rejects.toMatchObject({ status: 409 });
    await expect(buildIssueCollection(issue, [], settings)).rejects.toMatchObject({ status: 404 });
  });
  it('uses one cover across multiple subjects and one cover for a subject download', async () => {
    const articles = [
      { ...makeArticle('science', 1), subject_id: 'natural-sciences' },
      { ...makeArticle('economics', 2), subject_id: 'economics-business' },
    ];
    const source = await PDFDocument.create();
    source.addPage([401, 601]).drawText('Original manuscript');
    const bytes = await source.save();
    const reader = vi.fn<(id: string) => Promise<Uint8Array>>(async () => bytes);
    const full = await PDFDocument.load(await buildIssueCollection({ ...issue, cover_image_url: undefined }, articles, settings, reader));
    expect(full.getPageCount()).toBe(4); // Issue cover, contents and two manuscripts.
    expect(full.getPage(2).getWidth()).toBeCloseTo(595.28);
    expect(full.getPage(3).getWidth()).toBeCloseTo(595.28);
    reader.mockClear();
    const subject = await PDFDocument.load(await buildIssueCollection(issue, articles, settings, reader, 'natural-sciences'));
    expect(subject.getPageCount()).toBe(3);
    expect(subject.getPage(2).getWidth()).toBeCloseTo(595.28);
    expect(reader.mock.calls).toHaveLength(1);
  });
  it('supports uploaded WebP cover artwork and keeps a standard A4 cover', async () => {
    const webp = await sharp({ create: { width: 60, height: 90, channels: 3, background: '#1b5560' } }).webp().toBuffer();
    const result = await PDFDocument.load(await generateIssueCoverPdf(issue, settings, webp));
    expect(result.getPageCount()).toBe(1);
    expect(result.getPage(0).getHeight()).toBeCloseTo(841.89);
  });
  it('never fetches an arbitrary cover URL and requires the editor to restore it', async () => {
    await expect(buildIssueCollection({ ...issue, cover_image_url: 'https://example.com/cover.png' }, [makeArticle('a', 1)], settings)).rejects.toMatchObject({ status: 409 });
  });
  it('does not mutate source article order and places unnumbered records last', () => {
    const articles = [makeArticle('b', 5), { ...makeArticle('c', 2), page_first: undefined }, makeArticle('a', 1)];
    expect(orderIssueArticles(articles).map(a => a.id)).toEqual(['a', 'b', 'c']);
    expect(articles[0].id).toBe('b');
  });
  it('keeps a complete issue in page order across different subjects', async () => {
    const articles = [
      { ...makeArticle('third', 30), subject_id: 'economics-business' },
      { ...makeArticle('first', 1), subject_id: 'natural-sciences' },
      { ...makeArticle('second', 12), subject_id: 'education-humanities' },
    ];
    const source = await PDFDocument.create(); source.addPage();
    const bytes = await source.save();
    const reader = vi.fn<(id: string) => Promise<Uint8Array>>(async () => bytes);
    await buildIssueCollection({ ...issue, cover_image_url: undefined }, articles, settings, reader);
    expect(reader.mock.calls.map(([id]) => id)).toEqual(['first', 'second', 'third']);
  });
});
