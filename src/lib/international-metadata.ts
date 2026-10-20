import type { Article } from '@/types/journal';

/** Presence checks only: editorial staff must verify language and scientific quality. */
export function internationalMetadataGaps(article: Article): string[] {
  const gaps: string[] = [];
  if (!article.title_en?.trim()) gaps.push('Inglizcha sarlavha');
  if (!article.abstract_en?.trim()) gaps.push('Inglizcha annotatsiya');
  if (!article.keywords_en?.some(keyword => keyword.trim())) gaps.push('Inglizcha kalit so‘zlar');
  return gaps;
}
