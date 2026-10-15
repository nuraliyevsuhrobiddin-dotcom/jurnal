import type { Article } from '@/types/journal';

export function orderIssueArticles(articles: Article[]) {
  return [...articles].sort((a, b) => (a.page_first ?? Infinity) - (b.page_first ?? Infinity)
    || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}
