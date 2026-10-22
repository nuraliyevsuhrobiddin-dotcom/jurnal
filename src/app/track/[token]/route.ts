import { getArticleById, getAllCertificatesAdmin } from '@/lib/db';
import { editorialMessages } from '@/lib/editorial-messages';
import { readTrackingToken, submissionReference } from '@/lib/submission-tracking';
import { articleText, articleUrl } from '@/lib/scholarly-feeds';

const escape = (text: string) => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const headers = {
  'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
};
function html(body: string, status = 200) {
  return new Response(`<!doctype html><html lang="uz"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Maqola holati — AGM Journal</title><style>body{font:16px system-ui;background:#f4f7f8;color:#102b3f;margin:0}main{max-width:780px;margin:40px auto;padding:24px}section,article{background:white;border:1px solid #d8e3e6;border-radius:12px;padding:24px;margin:18px 0}h1{font-size:28px;overflow-wrap:anywhere}a{color:#087d75}p{line-height:1.7;white-space:pre-wrap;overflow-wrap:anywhere}.muted{color:#526470}.status{font-size:22px;font-weight:700;color:#087d75}</style><main><a href="/uz">AGM JOURNAL</a>${body}<p class="muted">Ushbu havola maxfiy. Uni faqat maqola mualliflari bilan ulashing. / Keep this link private.</p></main></html>`, { status, headers });
}
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const id = readTrackingToken(token);
    if (!id) return html('<h1>Havola yaroqsiz yoki muddati tugagan</h1><p>Yangi havola olish uchun tahririyatga murojaat qiling.</p>', 404);
    const article = await getArticleById(id);
    if (!article) return html('<h1>Maqola topilmadi</h1>', 404);
    const messages = await editorialMessages(id);
    const labels = { draft: 'Qabul qilindi / Received', under_review: 'Taqrizda / Under review', approved: 'Nashrga tasdiqlandi / Approved', published: 'Nashr qilindi / Published', rejected: 'Rad etildi / Rejected', withdrawn: 'Qaytarib olindi / Withdrawn', archived: 'Arxivlandi / Archived' };
    const revision = messages.filter(message => message.kind === 'revision_requested').at(-1);
    const status = article.status === 'under_review' && revision && Date.parse(revision.created_at) >= Date.parse(article.updated_at) ? 'Tuzatish kerak / Revision requested' : labels[article.status];
    const certs = article.status === 'published' ? (await getAllCertificatesAdmin()).filter(cert => cert.article_id === id && cert.status === 'valid') : [];
    return html(`<h1>${escape(articleText(article, article.original_language).title)}</h1><section><p class="muted">${escape(submissionReference(article))}</p><p class="status">${status}</p><p>Yuborilgan / Received: ${escape(article.created_at.slice(0, 10))}</p><p>Yangilangan / Updated: ${escape(article.updated_at.slice(0, 10))}</p>${article.status === 'published' ? `<a href="${escape(articleUrl(article))}">Nashr qilingan maqola / Published article →</a>` : ''}</section><h2>Tahririyat izohlari / Editorial notes</h2>${messages.length ? messages.map(message => `<article><strong>${message.kind === 'revision_requested' ? 'Tuzatish so‘rovi / Revision request' : 'Tahririyat xabari / Editorial note'}</strong><p class="muted">${escape(message.created_at.slice(0, 10))}</p><p>${escape(message.body)}</p></article>`).join('') : '<p>Hozircha izoh yo‘q. / No notes yet.</p>'}${certs.length ? `<h2>Sertifikatlar / Certificates</h2>${certs.map(cert => `<p><a href="/api/certificates/${encodeURIComponent(cert.certificate_number)}/pdf">${escape(cert.author_name)} — PDF ↓</a></p>`).join('')}` : ''}`);
  } catch { return html('<h1>Vaqtincha yuklab bo‘lmadi</h1><p>Keyinroq qayta urinib ko‘ring.</p>', 503); }
}
