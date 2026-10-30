import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getArticleById, getCertificateByCode } from '@/lib/db';
import { certificatePublicationState } from '@/lib/publication-state';
import { Search, CheckCircle2, XCircle, AlertTriangle, Download, ExternalLink } from 'lucide-react';
import type { Language } from '@/types/journal';
import { publicPageMetadata } from '@/lib/page-metadata';
import styles from '@/app/verify-certificate/verification.module.css';

const certCopy = {
  uz: {
    eyebrow: 'AGM Journal / Sertifikatlar',
    title: 'Mualliflik sertifikatini tekshirish',
    intro: 'Sertifikat raqami yoki tekshirish kodi orqali jurnal bazasidagi ma’lumotlarni ko‘ring.',
    label: 'Sertifikat raqami yoki tekshirish kodi',
    placeholder: 'AGM-CERT-2026-000101',
    hint: 'Raqam sertifikatning pastki qismida ko‘rsatilgan.',
    btn: 'Tekshirish',
    resultAria: 'Tekshiruv natijasi',
    verifiedTitle: 'Sertifikat tasdiqlandi',
    verifiedSubtitle: 'AGM Journal bazasida ro‘yxatga olingan.',
    revokedTitle: 'Sertifikat bekor qilingan',
    revokedSubtitle: 'Ushbu sertifikat tahririyat tomonidan yaroqsiz deb topilgan.',
    revokedDefaultReason: 'Tahririyat talablari buzilganligi munosabati bilan bekor qilingan',
    notFoundTitle: 'Sertifikat topilmadi',
    notFoundText: (c: string) => `${c} kodi bo‘yicha ma’lumot mavjud emas. Raqamni tekshirib, qayta urinib ko‘ring.`,
    note: 'Tekshiruv natijasi shu yerda ko‘rsatiladi.',
    certNumber: 'Sertifikat raqami',
    verCode: 'Tekshirish kodi',
    author: 'Muallif',
    article: 'Ilmiy maqola',
    issue: 'Jurnal soni',
    date: 'Berilgan sana',
    revocationReason: 'Bekor qilinish sababi',
    viewCert: 'Sertifikatni ko‘rish',
    downloadPdf: 'PDF yuklab olish',
  },
  en: {
    eyebrow: 'AGM Journal / Certificates',
    title: 'Verify Author Certificate',
    intro: 'Verify official certificate details from the AGM Journal database by certificate number or verification code.',
    label: 'Certificate number or verification code',
    placeholder: 'AGM-CERT-2026-000101',
    hint: 'The number is displayed at the bottom of the certificate.',
    btn: 'Verify',
    resultAria: 'Verification result',
    verifiedTitle: 'Certificate Verified',
    verifiedSubtitle: 'Registered in the AGM Journal official database.',
    revokedTitle: 'Certificate Revoked',
    revokedSubtitle: 'This certificate has been revoked by the editorial board.',
    revokedDefaultReason: 'Revoked due to breach of editorial policies',
    notFoundTitle: 'Certificate Not Found',
    notFoundText: (c: string) => `No records found for code ${c}. Please check the number and try again.`,
    note: 'Verification results will appear here.',
    certNumber: 'Certificate Number',
    verCode: 'Verification Code',
    author: 'Author',
    article: 'Research Article',
    issue: 'Journal Issue',
    date: 'Issue Date',
    revocationReason: 'Revocation Reason',
    viewCert: 'View Certificate',
    downloadPdf: 'Download PDF',
  },
  ru: {
    eyebrow: 'AGM Journal / Сертификаты',
    title: 'Проверка сертификата автора',
    intro: 'Проверьте подлинность сертификата в базе данных AGM Journal по номеру или коду верификации.',
    label: 'Номер сертификата или проверочный код',
    placeholder: 'AGM-CERT-2026-000101',
    hint: 'Номер указан в нижней части сертификата.',
    btn: 'Проверить',
    resultAria: 'Результат проверки',
    verifiedTitle: 'Сертификат подтверждён',
    verifiedSubtitle: 'Зарегистрирован в официальном реестре AGM Journal.',
    revokedTitle: 'Сертификат отозван',
    revokedSubtitle: 'Данный сертификат признан недействительным редакцией.',
    revokedDefaultReason: 'Отозван в связи с нарушением редакционных требований',
    notFoundTitle: 'Сертификат не найден',
    notFoundText: (c: string) => `Данные по коду ${c} не найдены. Проверьте номер и повторите попытку.`,
    note: 'Результаты проверки отобразятся здесь.',
    certNumber: 'Номер сертификата',
    verCode: 'Проверочный код',
    author: 'Автор',
    article: 'Научная статья',
    issue: 'Выпуск журнала',
    date: 'Дата выдачи',
    revocationReason: 'Причина отзыва',
    viewCert: 'Посмотреть сертификат',
    downloadPdf: 'Скачать PDF',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!['uz', 'en', 'ru'].includes(lang)) return {};
  const currentLang = lang as Language;
  const t = certCopy[currentLang];
  return publicPageMetadata(currentLang, '/verify-certificate', t.title, t.intro);
}

export default async function VerifyCertificatePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ code?: string }>;
}) {
  const { lang } = await params;
  if (!['uz', 'en', 'ru'].includes(lang)) notFound();
  const currentLang = lang as Language;
  const t = certCopy[currentLang];

  const { code } = await searchParams;
  const trimmedCode = code?.trim();
  const cert = trimmedCode ? await getCertificateByCode(trimmedCode) : null;
  const state = cert ? certificatePublicationState(cert, await getArticleById(cert.article_id), currentLang) : null;
  const pendingTitle = currentLang === 'en' ? 'Publication not currently verified' : currentLang === 'ru' ? 'Публикация сейчас не подтверждена' : 'Nashr holati hozir tasdiqlanmagan';

  return (
    <div className={styles.page}>
      <section className={styles.intro}>
        <div className={styles.width}>
          <p className={styles.eyebrow}>{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
        </div>
      </section>

      <div className={`${styles.width} ${styles.content}`}>
        <form method="GET" action={`/${currentLang}/verify-certificate`} className={styles.form}>
          <label htmlFor="certificate-code">{t.label}</label>
          <div className={styles.search}>
            <Search size={18} aria-hidden="true" />
            <input
              id="certificate-code"
              type="text"
              name="code"
              defaultValue={trimmedCode || ''}
              required
              placeholder={t.placeholder}
              autoComplete="off"
            />
            <button type="submit">{t.btn}</button>
          </div>
          <p>{t.hint}</p>
        </form>

        {trimmedCode ? (
          cert ? (
            state?.valid ? (
              <section className={styles.result} aria-label={t.resultAria}>
                <div className={styles.status}>
                  <CheckCircle2 size={23} />
                  <div>
                    <h2>{t.verifiedTitle}</h2>
                    <p>{t.verifiedSubtitle}</p>
                  </div>
                </div>
                <dl className={styles.details}>
                  <div>
                    <dt>{t.certNumber}</dt>
                    <dd className={styles.code}>{cert.certificate_number}</dd>
                  </div>
                  <div>
                    <dt>{t.verCode}</dt>
                    <dd className={styles.code}>{cert.verification_code}</dd>
                  </div>
                  <div className={styles.full}>
                    <dt>{t.author}</dt>
                    <dd>{cert.author_name}</dd>
                    {cert.author_affiliation && <dd className={styles.affiliation}>{cert.author_affiliation}</dd>}
                  </div>
                  <div className={styles.full}>
                    <dt>{t.article}</dt>
                    <dd className={styles.title}>{cert.article_title}</dd>
                  </div>
                  <div>
                    <dt>{t.issue}</dt>
                    <dd>
                      {cert.journal_name}, Vol. {cert.issue_volume}, No. {cert.issue_number} ({cert.issue_year})
                    </dd>
                  </div>
                  <div>
                    <dt>{t.date}</dt>
                    <dd>{cert.issue_date}</dd>
                  </div>
                </dl>
                <div className={styles.actions}>
                  <Link href={`/certificate/${cert.certificate_number}`}>
                    {t.viewCert}
                    <ExternalLink size={14} />
                  </Link>
                  <a
                    className={styles.download}
                    href={`/api/certificates/${cert.certificate_number}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download size={16} />
                    {t.downloadPdf}
                  </a>
                </div>
              </section>
            ) : (
              <section className={styles.result} aria-label={t.resultAria}>
                <div className={`${styles.status} ${styles.revoked}`}>
                  <XCircle size={23} />
                  <div>
                    <h2>{cert.status === 'revoked' ? t.revokedTitle : pendingTitle}</h2>
                    <p>{cert.status === 'revoked' ? t.revokedSubtitle : pendingTitle}</p>
                  </div>
                </div>
                <dl className={styles.details}>
                  <div>
                    <dt>{t.certNumber}</dt>
                    <dd className={styles.code}>{cert.certificate_number}</dd>
                  </div>
                  <div>
                    <dt>{t.author}</dt>
                    <dd>{cert.author_name}</dd>
                  </div>
                  <div className={styles.full}>
                    <dt>{t.revocationReason}</dt>
                    <dd>{state?.reason || t.revokedDefaultReason}</dd>
                  </div>
                </dl>
              </section>
            )
          ) : (
            <section className={`${styles.result} ${styles.empty}`} aria-label={t.resultAria}>
              <AlertTriangle size={24} />
              <h2>{t.notFoundTitle}</h2>
              <p>{t.notFoundText(trimmedCode)}</p>
            </section>
          )
        ) : (
          <p className={styles.note}>{t.note}</p>
        )}
      </div>
    </div>
  );
}
