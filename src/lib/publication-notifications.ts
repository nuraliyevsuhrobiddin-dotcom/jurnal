import { z } from 'zod';
import { createHash } from 'node:crypto';
import type { Article } from '@/types/journal';
import { createCertificate, getAllCertificatesAdmin, getArticleById, getCertificateByCode, getJournalSettings } from './db';
import { queueNotificationOnce, type Notification } from './notifications';
import { queueArticleStatusNotification } from './article-status-notifications';
import { articleText, articleUrl } from './scholarly-feeds';
import { generateCertificatePdf } from './pdf/generator';
import { readArticlePdf } from './pdf/storage';
import { trackingUrl } from './submission-tracking';

export interface PublicationAttachment { article_id: string; certificate_number: string }
export interface EmailAttachment { filename: string; content: string }

export async function queueArticleNotifications(previous: Article, article: Article): Promise<Notification[]> {
  if (article.status !== 'published') {
    const item = await queueArticleStatusNotification(previous, article);
    return item ? [item] : [];
  }
  // A same-status save can repair an interrupted publication without mailing twice.
  if (!article.issue || !article.publication_date) throw new Error('Jurnal soni va nashr sanasi kerak.');
  const certificates = await getAllCertificatesAdmin();
  const authors = article.authors || [];
  const corresponding = authors.find(author => author.is_corresponding && z.email().safeParse(author.email).success);
  const queued: Notification[] = [];
  for (const author of authors) {
    let cert = certificates.find(item => item.article_id === article.id && item.author_name === author.full_name && item.status === 'valid');
    // Revocation is an editorial decision; a routine article save must respect it.
    if (!cert && certificates.some(item => item.article_id === article.id && item.author_name === author.full_name && item.status === 'revoked')) continue;
    if (!cert) {
      const generation = certificates.filter(item => item.article_id === article.id && item.author_name === author.full_name).length;
      const hash = createHash('sha256').update(`${article.id}:${author.full_name}:${generation}`).digest('hex');
      const issuanceId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
      cert = await createCertificate({
        issuance_id: issuanceId,
        article_id: article.id, author_name: author.full_name, author_affiliation: author.affiliation,
        article_title: articleText(article, article.original_language).title,
        issue_volume: article.issue.volume, issue_number: article.issue.issue_number,
        issue_year: article.issue.year, issue_date: article.publication_date,
      });
      certificates.push(cert);
    }
    const recipient = z.email().safeParse(author.email).success ? author.email : corresponding?.email;
    if (!recipient) continue; // Certificate remains available in the admin panel.
    const title = articleText(article, article.original_language).title.replace(/[\r\n]/g, ' ');
    const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://agmjoural.uz').replace(/\/$/, '');
    const verification = `${base}/certificate/${encodeURIComponent(cert.certificate_number)}`;
    const greeting = article.original_language === 'uz'
      ? `Hurmatli ${author.full_name}!\n\n“${title}” maqolangiz AGM Journal jurnalida nashr qilindi. Maqola va nashr sertifikati ushbu xatga ilova qilindi.`
      : article.original_language === 'ru'
      ? `Уважаемый(ая) ${author.full_name}!\n\nВаша статья «${title}» опубликована в AGM Journal. PDF статьи и сертификат приложены к письму.`
      : `Dear ${author.full_name},\n\nYour article “${title}” has been published in AGM Journal. Your article PDF and publication certificate are attached.`;
    const item = await queueNotificationOnce(`publication:${article.id}:${cert.id}:${recipient.toLowerCase()}`, {
      recipient, subject: `AGM Journal — ${title}`.slice(0, 250),
      body: `${greeting}\n\n${articleUrl(article)}\n${verification}\n\nMaqola holati / Track manuscript:\n${trackingUrl(article.id)}\n\nAGM Journal`,
      publication: { article_id: article.id, certificate_number: cert.certificate_number },
    });
    if (item) queued.push(item);
  }
  return queued;
}

export async function publicationAttachments(publication: PublicationAttachment): Promise<EmailAttachment[]> {
  const [article, cert, settings] = await Promise.all([
    getArticleById(publication.article_id), getCertificateByCode(publication.certificate_number), getJournalSettings(),
  ]);
  if (!article || article.status !== 'published') throw new Error('Maqola hozir nashr holatida emas.');
  if (!cert || cert.status !== 'valid' || cert.article_id !== article.id) throw new Error('Sertifikat bekor qilingan yoki topilmadi.');
  const bytes = await readArticlePdf(article.id);
  if (!bytes) throw new Error('Maqola PDF fayli topilmadi.');
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://agmjoural.uz').replace(/\/$/, '');
  const certificate = await generateCertificatePdf(cert, `${base}/certificate/${encodeURIComponent(cert.certificate_number)}`, settings);
  // Stay below provider message limits after base64/MIME expansion.
  if (bytes.length + certificate.length > 17 * 1024 * 1024) throw new Error('Email PDF fayllari 17 MB dan oshdi. Fayl hajmini kamaytiring.');
  return [
    { filename: `article-${article.id}.pdf`, content: Buffer.from(bytes).toString('base64') },
    { filename: `${cert.certificate_number}.pdf`, content: Buffer.from(certificate).toString('base64') },
  ];
}
