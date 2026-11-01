import type { Article } from '@/types/journal';

export type CitationArticle = Pick<Article, 'id' | 'slug' | 'title_uz' | 'title_en' | 'title_ru' | 'publication_date' | 'page_first' | 'page_last' | 'doi'> & {
  authors: { full_name: string }[];
  issue?: { year: number; volume: number; issue_number: number };
};

/** Allowlist for the public server-to-client boundary; never spread stored records. */
export function citationData(article: Article): CitationArticle {
  return {
    id: article.id, slug: article.slug, title_uz: article.title_uz, title_en: article.title_en, title_ru: article.title_ru,
    publication_date: article.publication_date, page_first: article.page_first, page_last: article.page_last,
    doi: article.doi, authors: (article.authors || []).map(author => ({ full_name: author.full_name })),
    issue: article.issue ? { year: article.issue.year, volume: article.issue.volume, issue_number: article.issue.issue_number } : undefined,
  };
}
