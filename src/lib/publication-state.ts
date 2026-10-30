import type { Article, Certificate, Language } from '@/types/journal';

export function isPublicArticle(article: Article) {
  return article.status === 'published' || ((article.status === 'withdrawn' || article.status === 'archived') && !!article.first_published_at);
}

export function certificatePublicationState(cert: Certificate, article: Article | null, lang: Language = 'uz') {
  const copy = {
    uz: { revoked: 'Sertifikat bekor qilingan.', withdrawn: 'Maqola nashrdan qaytarib olingan.', suspended: 'Maqola hozir ochiq nashr holatida emas. Sertifikat orqali nashrni tasdiqlash vaqtincha to‘xtatilgan.', changed: 'Nashr ma’lumotlari yangilangan. Sertifikatni yangilash uchun tahririyatga murojaat qiling.' },
    en: { revoked: 'The certificate has been revoked.', withdrawn: 'The article has been withdrawn.', suspended: 'The article is not currently published. Publication verification is temporarily suspended.', changed: 'Publication details have changed. Contact the editorial office for an updated certificate.' },
    ru: { revoked: 'Сертификат отозван.', withdrawn: 'Статья отозвана из публикации.', suspended: 'Статья сейчас не опубликована. Подтверждение публикации временно приостановлено.', changed: 'Сведения о публикации изменились. Обратитесь в редакцию для обновления сертификата.' },
  }[lang];
  if (cert.status === 'revoked') return { valid: false, reason: cert.revoked_reason || copy.revoked };
  if (!article || article.status !== 'published') return { valid: false, reason: article?.status === 'withdrawn' ? copy.withdrawn : copy.suspended };
  const title = article[`title_${article.original_language}`] || article.title_uz;
  const author = article.authors?.find(item => item.full_name === cert.author_name);
  if (!author || (cert.author_affiliation || '') !== (author.affiliation || '') || cert.article_title !== title || cert.issue_volume !== article.issue?.volume || cert.issue_number !== article.issue?.issue_number || cert.issue_year !== article.issue?.year || cert.issue_date !== article.publication_date) {
    return { valid: false, reason: copy.changed };
  }
  return { valid: true, reason: '' };
}
