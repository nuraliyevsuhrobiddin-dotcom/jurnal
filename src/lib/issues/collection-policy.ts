import type { Article, Language } from '@/types/journal';
import { resolveSubjectId } from '@/lib/subjects';

export const MIN_COLLECTION_ARTICLES = 25;

/** Catalog visibility only. Direct article access and indexing remain available. */
export function catalogArticles(articles: Article[], released: Record<string, string> = {}): Article[] {
  const counts = new Map<string, number>();
  const key = (article: Article) => JSON.stringify([article.issue_id, resolveSubjectId(article)]);
  for (const article of articles) {
    if (article.status === 'published' && article.issue_id) {
      counts.set(key(article), (counts.get(key(article)) || 0) + 1);
    }
  }
  return articles.filter(article => article.status === 'published' && !!article.issue_id &&
    (!!released[`${article.issue_id}:${resolveSubjectId(article)}`] || (counts.get(key(article)) || 0) >= MIN_COLLECTION_ARTICLES));
}

export function collectionVisibilityMessage(lang: Language) {
  if (lang === 'en') return `Articles appear in the catalog once their subject collection in an issue reaches ${MIN_COLLECTION_ARTICLES} published articles. Once released, the collection remains open.`;
  if (lang === 'ru') return `Статьи появятся в каталоге, когда в тематической коллекции одного выпуска будет опубликовано ${MIN_COLLECTION_ARTICLES} статей. После открытия коллекция остаётся доступной.`;
  return `Maqolalar har bir jurnal sonidagi yo‘nalish to‘plamida ${MIN_COLLECTION_ARTICLES} ta nashr etilgan maqola yig‘ilgach katalogda ko‘rinadi. Ochilgan to‘plam keyin qayta yashirilmaydi.`;
}

export function collectionPendingMessage(lang: Language, count: number) {
  if (lang === 'en') return `Collection download opens at ${MIN_COLLECTION_ARTICLES} published articles (${count}/${MIN_COLLECTION_ARTICLES}).`;
  if (lang === 'ru') return `PDF будет доступен после публикации ${MIN_COLLECTION_ARTICLES} статей (${count}/${MIN_COLLECTION_ARTICLES}).`;
  return `To‘plamni yuklab olish ${MIN_COLLECTION_ARTICLES} ta maqola nashr qilingach ochiladi (${count}/${MIN_COLLECTION_ARTICLES}).`;
}
