import type { Language } from '@/types/journal';

export const MIN_COLLECTION_ARTICLES = 25;

export function collectionPendingMessage(lang: Language, count: number) {
  if (lang === 'en') return `Collection download opens at ${MIN_COLLECTION_ARTICLES} published articles (${count}/${MIN_COLLECTION_ARTICLES}).`;
  if (lang === 'ru') return `PDF будет доступен после публикации ${MIN_COLLECTION_ARTICLES} статей (${count}/${MIN_COLLECTION_ARTICLES}).`;
  return `To‘plamni yuklab olish ${MIN_COLLECTION_ARTICLES} ta maqola nashr qilingach ochiladi (${count}/${MIN_COLLECTION_ARTICLES}).`;
}
