import type { Article } from '@/types/journal';

/** Basic completeness checks: staff must still verify identity and scientific quality. */
export function internationalMetadataGaps(article: Article, requireEnglish = true): string[] {
  const gaps: string[] = [];
  if (article.authors?.some(author => /(?:^|\s)X{3,}(?:\s|$)/i.test(author.full_name))) {
    gaps.push('Muallifning tasdiqlangan to‘liq ismi (XXX o‘rniga)');
  }
  if (requireEnglish) {
    if (!article.title_en?.trim()) gaps.push('Inglizcha sarlavha');
    if (!article.abstract_en?.trim()) gaps.push('Inglizcha annotatsiya');
    if (!article.keywords_en?.some(keyword => keyword.trim())) gaps.push('Inglizcha kalit so‘zlar');
  }
  return gaps;
}
