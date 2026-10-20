import { z } from 'zod';
import type { Article, ArticleStatus } from '@/types/journal';
import { queueNotificationOnce } from './notifications';
import { articleText, articleUrl } from './scholarly-feeds';

const labels: Record<'uz' | 'en' | 'ru', Record<ArticleStatus, string>> = {
  uz: { draft: 'Qoralama', under_review: 'Taqrizda', approved: 'Nashrga tasdiqlandi', published: 'Nashr qilindi', rejected: 'Rad etildi', withdrawn: 'Qaytarib olindi', archived: 'Arxivlandi' },
  en: { draft: 'Draft', under_review: 'Under review', approved: 'Approved for publication', published: 'Published', rejected: 'Rejected', withdrawn: 'Withdrawn', archived: 'Archived' },
  ru: { draft: 'Черновик', under_review: 'На рецензировании', approved: 'Одобрено к публикации', published: 'Опубликовано', rejected: 'Отклонено', withdrawn: 'Отозвано', archived: 'В архиве' },
};

export async function queueArticleStatusNotification(previous: Article, updated: Article) {
  if (previous.status === updated.status) return null;
  const author = [...(updated.authors || [])].sort((a, b) => a.order_index - b.order_index)
    .find(item => item.is_corresponding && z.email().safeParse(item.email).success);
  if (!author?.email) return null;
  const lang = updated.original_language;
  const title = articleText(updated, lang).title.replace(/[\r\n]/g, ' ');
  const status = labels[lang][updated.status];
  const description = lang === 'uz' ? 'Maqolangizning tahririyatdagi holati yangilandi.' : lang === 'ru' ? 'Редакционный статус вашей статьи изменён.' : 'The editorial status of your manuscript has changed.';
  return queueNotificationOnce(`article-status:${updated.id}:${previous.status}:${updated.status}:${updated.updated_at}`, {
    recipient: author.email, subject: `AGM Journal — ${status}: ${title}`.slice(0, 250),
    body: `${description}\n\n${title}\n${status}\nID: ${updated.id}${updated.status === 'published' ? `\n${articleUrl(updated)}` : ''}`,
  });
}
