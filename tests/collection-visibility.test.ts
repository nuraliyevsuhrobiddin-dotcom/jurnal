import { describe, expect, it } from 'vitest';
import { catalogArticles } from '@/lib/issues/collection-policy';
import { journalStore } from '@/lib/data-store';
import { getCatalogArticles, getPublishedArticles, getArticleBySlug } from '@/lib/db';
import { getArticlePage } from '@/lib/article-page';
import type { Article } from '@/types/journal';

function papers(count: number, overrides: Partial<Article> = {}): Article[] {
  return Array.from({ length: count }, (_, index) => ({
    ...journalStore.articles[0], status: 'published', issue_id: 'issue-a',
    subject_id: 'natural-sciences', id: `paper-${index}`, slug: `paper-${index}`,
    ...overrides,
  }));
}

describe('Subject collection catalog visibility', () => {
  it('opens all papers at 25 published articles and excludes drafts from the threshold', () => {
    expect(catalogArticles(papers(24))).toHaveLength(0);
    expect(catalogArticles([...papers(24), ...papers(1, { status: 'draft' })])).toHaveLength(0);
    expect(catalogArticles(papers(25))).toHaveLength(25);
    expect(catalogArticles(papers(26))).toHaveLength(26);
  });

  it('counts each issue and subject independently and excludes unassigned issues', () => {
    const ready = papers(25);
    const otherIssue = papers(24, { issue_id: 'issue-b' });
    const otherSubject = papers(24, { subject_id: 'social-sciences' });
    const unassigned = papers(25, { issue_id: undefined });
    expect(catalogArticles([...ready, ...otherIssue, ...otherSubject, ...unassigned])).toEqual(ready);
  });

  it('filters collections before search, latest limits and pagination while keeping published links indexable', async () => {
    const saved = journalStore.articles;
    const ready = papers(25).map((article, index) => ({ ...article, title_uz: index === 0 ? 'Unique search result' : 'Other research' }));
    const pending = papers(24, { issue_id: 'issue-b', subject_id: 'social-sciences', slug: 'pending-paper', publication_date: '2099-01-01' });
    journalStore.articles = [...pending, ...ready];
    try {
      expect(await getCatalogArticles({ query: 'Unique search result' })).toHaveLength(1);
      expect(await getCatalogArticles({ limit: 4 })).toHaveLength(4);
      expect((await getCatalogArticles({ limit: 4 })).every(article => article.issue_id === 'issue-a')).toBe(true);
      const page = await getArticlePage({ subject: 'natural-sciences', page: '3' });
      expect(page.total).toBe(25);
      expect(page.articles).toHaveLength(1);
      expect((await getArticlePage({ subject: 'social-sciences' })).total).toBe(0);
      expect(await getPublishedArticles()).toHaveLength(49);
      expect(await getArticleBySlug('pending-paper')).not.toBeNull();
    } finally {
      journalStore.articles = saved;
    }
  });
});
