import Link from 'next/link';
import { getCertificateByCode } from '@/lib/db';
import { Search, CheckCircle2, XCircle, AlertTriangle, Download, ArrowLeft, ExternalLink } from 'lucide-react';
import styles from './verification.module.css';

export default async function VerifyCertificatePage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  const cert = code ? await getCertificateByCode(code) : null;

  return <main className={styles.page} lang="uz">
    <header className={styles.header}>
      <div className={styles.width}>
        <Link href="/" className={styles.back}><ArrowLeft size={14} />Bosh sahifa</Link>
        <Link href="/" className={styles.brand}>AGM <span>JOURNAL</span></Link>
      </div>
    </header>
    <section className={styles.intro}>
      <div className={styles.width}>
        <p className={styles.eyebrow}>AGM Journal / Sertifikatlar</p>
        <h1>Mualliflik sertifikatini tekshirish</h1>
        <p>Sertifikat raqami yoki tekshirish kodi orqali jurnal bazasidagi ma’lumotlarni ko‘ring.</p>
      </div>
    </section>
    <div className={`${styles.width} ${styles.content}`}>
      <form method="GET" className={styles.form}>
        <label htmlFor="certificate-code">Sertifikat raqami yoki tekshirish kodi</label>
        <div className={styles.search}>
          <Search size={18} aria-hidden="true" />
          <input id="certificate-code" type="text" name="code" defaultValue={code || ''} required placeholder="AGM-CERT-2026-000101" autoComplete="off" />
          <button type="submit">Tekshirish</button>
        </div>
        <p>Raqam sertifikatning pastki qismida ko‘rsatilgan.</p>
      </form>
      {code ? cert ? cert.status === 'valid' ? <section className={styles.result} aria-label="Tekshiruv natijasi">
        <div className={styles.status}><CheckCircle2 size={23} /><div><h2>Sertifikat tasdiqlandi</h2><p>AGM Journal bazasida ro‘yxatga olingan.</p></div></div>
        <dl className={styles.details}>
          <div><dt>Sertifikat raqami</dt><dd className={styles.code}>{cert.certificate_number}</dd></div>
          <div><dt>Tekshirish kodi</dt><dd className={styles.code}>{cert.verification_code}</dd></div>
          <div className={styles.full}><dt>Muallif</dt><dd>{cert.author_name}</dd>{cert.author_affiliation && <dd className={styles.affiliation}>{cert.author_affiliation}</dd>}</div>
          <div className={styles.full}><dt>Ilmiy maqola</dt><dd className={styles.title}>{cert.article_title}</dd></div>
          <div><dt>Jurnal soni</dt><dd>{cert.journal_name}, Vol. {cert.issue_volume}, No. {cert.issue_number} ({cert.issue_year})</dd></div>
          <div><dt>Berilgan sana</dt><dd>{cert.issue_date}</dd></div>
        </dl>
        <div className={styles.actions}>
          <Link href={`/certificate/${cert.certificate_number}`}>Sertifikatni ko‘rish<ExternalLink size={14} /></Link>
          <a className={styles.download} href={`/api/certificates/${cert.certificate_number}/pdf`} target="_blank" rel="noopener noreferrer"><Download size={16} />PDF yuklab olish</a>
        </div>
      </section> : <section className={styles.result} aria-label="Tekshiruv natijasi">
        <div className={`${styles.status} ${styles.revoked}`}><XCircle size={23} /><div><h2>Sertifikat bekor qilingan</h2><p>Ushbu sertifikat tahririyat tomonidan yaroqsiz deb topilgan.</p></div></div>
        <dl className={styles.details}>
          <div><dt>Sertifikat raqami</dt><dd className={styles.code}>{cert.certificate_number}</dd></div>
          <div><dt>Muallif</dt><dd>{cert.author_name}</dd></div>
          <div className={styles.full}><dt>Bekor qilinish sababi</dt><dd>{cert.revoked_reason || 'Tahririyat talablari buzilganligi munosabati bilan bekor qilingan'}</dd></div>
        </dl>
      </section> : <section className={`${styles.result} ${styles.empty}`} aria-label="Tekshiruv natijasi"><AlertTriangle size={24} /><h2>Sertifikat topilmadi</h2><p><strong>{code}</strong> kodi bo‘yicha ma’lumot mavjud emas. Raqamni tekshirib, qayta urinib ko‘ring.</p></section> : <p className={styles.note}>Tekshiruv natijasi shu yerda ko‘rsatiladi.</p>}
    </div>
    <footer className={styles.footer}><div className={styles.width}>AGM Journal <span>Ilmiy nashrlar va mualliflik sertifikatlari</span></div></footer>
  </main>;
}
