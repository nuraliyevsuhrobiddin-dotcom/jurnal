import { PDFDocument } from 'pdf-lib';
import type { Article } from '@/types/journal';
import { readArticlePdf } from './pdf/storage';
import { publicationBodyPageCount } from './pdf/manuscript-conversion';
import { articleSchema } from './article-validation';
import { internationalMetadataGaps } from './international-metadata';

export class PublicationError extends Error {}

export function getIssueOccupiedPages(issueId: string, published: Article[], excludeArticleId?: string) {
  return published
    .filter(other => other.id !== excludeArticleId && other.status === 'published'
      && other.issue_id === issueId && other.page_first != null && other.page_last != null)
    .map(other => ({
      id: other.id,
      title: other.title_uz || other.title_en || other.title_ru,
      page_first: other.page_first!,
      page_last: other.page_last!,
    }))
    .sort((a, b) => a.page_first - b.page_first);
}

export function nextAvailableIssuePage(issueId: string, published: Article[], excludeArticleId?: string): number {
  const occupied = getIssueOccupiedPages(issueId, published, excludeArticleId);
  if (!occupied.length) return 1;
  return Math.max(0, ...occupied.map(o => o.page_last)) + 1;
}

export function assertIssuePageRangeAvailable(article: Article, published: Article[]) {
  const { issue_id, page_first, page_last } = article;
  if (!issue_id || page_first == null || page_last == null) return;
  const conflict = published.find(other => other.id !== article.id && other.status === 'published'
    && other.issue_id === issue_id && other.page_first != null && other.page_last != null
    && other.page_first <= page_last && other.page_last >= page_first);
  if (conflict) {
    const nextPage = nextAvailableIssuePage(issue_id, published, article.id);
    const count = Math.max(1, page_last - page_first + 1);
    const suggestedLast = nextPage + count - 1;
    throw new PublicationError(`Bu jurnal sonida ${conflict.page_first}–${conflict.page_last} sahifalari boshqa maqolaga ajratilgan. Tavsiya etilgan bo‘sh sahifalar: ${nextPage}–${suggestedLast}. Bo‘sh sahifa diapazonini belgilang va PDF’ni qayta tayyorlang.`);
  }
}

export async function assertPublicationReady(article: Article) {
  const parsed = articleSchema.safeParse(article);
  if (!parsed.success) throw new PublicationError('Nashr uchun sarlavha, annotatsiya, kalit so‘zlar va muallif ma’lumotlarini to‘ldiring.');
  const metadataGaps = internationalMetadataGaps(article, false);
  if (metadataGaps.length) throw new PublicationError(`Nashrdan oldin xalqaro metama’lumotlarni to‘ldiring: ${metadataGaps.join(', ')}.`);
  if (!article.issue_id || !article.issue || !article.page_first || !article.page_last) {
    throw new PublicationError('Nashrdan oldin jurnal soni va maqola sahifalarini belgilang.');
  }
  if (!article.pdf_url || !article.pdf_file_size) throw new PublicationError('Nashrdan oldin to‘liq maqola PDF faylini yuklang.');
  const bytes = await readArticlePdf(article.id);
  if (!bytes) throw new PublicationError('Maqola PDF fayli saqlash joyida topilmadi. Qayta yuklang.');
  try {
    const pdf = await PDFDocument.load(bytes);
    if (pdf.getPageCount() < 1 || pdf.getKeywords()?.includes('AGM_METADATA_ONLY')) throw new Error('Missing manuscript');
    const bodyFirst = pdf.getKeywords()?.match(/(?:^|\s)AGM_BODY_FIRST:(\d+)(?:\s|$)/)?.[1];
    if (bodyFirst && Number(bodyFirst) !== article.page_first) throw new PublicationError('Birinchi sahifa o‘zgargan. Sahifa raqamlari mos bo‘lishi uchun asl qo‘lyozmadan PDF’ni qayta tayyorlang.');
    if (article.page_last - article.page_first + 1 !== publicationBodyPageCount(pdf)) {
      throw new PublicationError('Maqola sahifalari PDF betlari soniga mos emas. To‘liq faylni qayta saqlang yoki sahifalarni to‘g‘rilang.');
    }
  } catch (error) {
    if (error instanceof PublicationError) throw error;
    throw new PublicationError('To‘liq va o‘qiladigan maqola PDF faylini yuklang.');
  }
}
