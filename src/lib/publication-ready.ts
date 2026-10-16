import { PDFDocument } from 'pdf-lib';
import type { Article } from '@/types/journal';
import { readArticlePdf } from './pdf/storage';
import { articleSchema } from './article-validation';

export class PublicationError extends Error {}

export async function assertPublicationReady(article: Article) {
  const parsed = articleSchema.safeParse(article);
  if (!parsed.success) throw new PublicationError('Nashr uchun sarlavha, annotatsiya, kalit so‘zlar va muallif ma’lumotlarini to‘ldiring.');
  if (!article.issue_id || !article.issue || !article.page_first || !article.page_last) {
    throw new PublicationError('Nashrdan oldin jurnal soni va maqola sahifalarini belgilang.');
  }
  if (!article.pdf_url || !article.pdf_file_size) throw new PublicationError('Nashrdan oldin to‘liq maqola PDF faylini yuklang.');
  const bytes = await readArticlePdf(article.id);
  if (!bytes) throw new PublicationError('Maqola PDF fayli saqlash joyida topilmadi. Qayta yuklang.');
  try {
    const pdf = await PDFDocument.load(bytes);
    if (pdf.getPageCount() < 1 || pdf.getKeywords()?.includes('AGM_METADATA_ONLY')) throw new Error('Missing manuscript');
  } catch {
    throw new PublicationError('To‘liq va o‘qiladigan maqola PDF faylini yuklang.');
  }
}
