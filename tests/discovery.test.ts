import { describe, it, expect, vi, afterEach } from 'vitest';
import { normalizeDoi, isValidDoi } from '@/lib/identifiers';
import { inspectDoi } from '@/lib/doi';
import { exportCitation } from '@/lib/citation-export';
import { journalStore } from '@/lib/data-store';
import { publicPageMetadata } from '@/lib/page-metadata';
import { scholarlyAuthorName, generateArticleJsonLd } from '@/lib/seo';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';

vi.mock('next/server', async () => { const actual = await vi.importActual('next/server'); return { ...actual, connection: vi.fn() }; });
afterEach(() => vi.unstubAllGlobals());

describe('Research discovery', () => {
  it('normalizes DOI URLs and rejects non-DOIs without making a registration claim', () => {
    expect(normalizeDoi(' https://doi.org/10.1234/real-id ')).toBe('10.1234/real-id');
    expect(isValidDoi('10.1234/real-id')).toBe(true);
    expect(isValidDoi('fake-doi')).toBe(false);
    expect(isValidDoi('10.1234/with spaces')).toBe(false);
  });
  it('reports registered, missing and unavailable DOI resolution without following destinations', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    fetcher.mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: 'https://publisher.example/article' } }));
    expect((await inspectDoi('10.1234/test')).active).toBe(true);
    expect(fetcher.mock.calls[0][1].redirect).toBe('manual');
    fetcher.mockResolvedValueOnce(new Response(null, { status: 404 }));
    expect((await inspectDoi('10.1234/missing')).status).toBe('not_registered');
    fetcher.mockRejectedValueOnce(new Error('network'));
    expect((await inspectDoi('10.1234/test')).status).toBe('unavailable');
  });
  it('uses locale-specific canonical metadata and language alternatives', () => {
    const result = publicPageMetadata('en', '/archive', 'Archive', 'Research archive');
    expect(result.alternates?.canonical).toMatch(/\/en\/archive$/);
    expect(result.alternates?.languages?.['x-default']).toMatch(/\/en\/archive$/);
    expect(scholarlyAuthorName('Prof. Dr. Example Author')).toBe('Example Author');
  });
  it('exports importable RIS and BibTeX without inventing identifiers', () => {
    const article = { ...journalStore.articles[0], doi: undefined, title_en: 'Safe {research} & evidence' };
    const ris = exportCitation(article, 'AGM Journal', 'en', 'ris');
    expect(ris).toContain('TY  - JOUR\r\n'); expect(ris).not.toContain('DO  -');
    const bib = exportCitation(article, 'AGM Journal', 'en', 'bib');
    expect(bib).toContain('Safe \\{research\\} \\& evidence');
    expect(bib).not.toContain('doi =');
  });
  it('describes the visible article translation, license and same-directory PDF', () => {
    const article = { ...journalStore.articles[0], title_ru: 'Научная статья', abstract_ru: 'Аннотация исследования' };
    const data = generateArticleJsonLd(article, journalStore.settings, 'ru');
    expect(data.headline).toBe(article.title_ru);
    expect(data.encoding.contentUrl).toContain('/ru/article/');
    expect(data.encoding.contentUrl).toMatch(/\/fulltext.pdf$/);
    expect(data.isAccessibleForFree).toBe(true);
  });
  it('publishes a crawlable sitemap with actual modification dates and no draft records', async () => {
    const entries = await sitemap();
    expect(entries.some(entry => entry.url.endsWith('/en/announcements'))).toBe(true);
    expect(entries.some(entry => entry.url.endsWith('/en/issue/' + journalStore.issues[0].id))).toBe(true);
    const published = journalStore.articles.find(article => article.status === 'published')!;
    expect(entries.find(entry => entry.url.endsWith('/en/article/' + published.slug))?.lastModified).toBe(published.updated_at);
    for (const article of journalStore.articles.filter(article => article.status !== 'published')) expect(entries.some(entry => entry.url.endsWith('/article/' + article.slug))).toBe(false);
    const rules = robots().rules;
    expect(Array.isArray(rules) && rules.some(rule => rule.userAgent === '*' && rule.allow === '/')).toBe(true);
  });
});
