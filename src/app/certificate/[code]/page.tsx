import Link from 'next/link';
import Image from 'next/image';
import { headers } from 'next/headers';
import { generateQrDataUrl } from '@/lib/pdf/qr';
import { notFound } from 'next/navigation';
import { getCertificateByCode, getJournalSettings } from '@/lib/db';
import { isValidIssn } from '@/lib/identifiers';
import { CheckCircle2, XCircle, Download, ArrowLeft } from 'lucide-react';
import styles from './certificate.module.css';
import { certificateServices } from '@/lib/pdf/certificate-services';

export default async function DedicatedCertificatePage({ params }: { params: Promise<{ code: string }> }) {
 const { code } = await params;
 const [cert, settings] = await Promise.all([getCertificateByCode(code), getJournalSettings()]);
 if (!cert) notFound();
 const isValid = cert.status === 'valid';
 const requestHeaders = await headers();
 const host = requestHeaders.get('host') || 'localhost:3000';
 const protocol = host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https';
 const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;
 const verificationUrl = new URL(`/certificate/${encodeURIComponent(cert.certificate_number)}`, baseUrl).toString();
 const qrCode = await generateQrDataUrl(verificationUrl);
 return <main className={styles.page}>
  <div className={styles.wrap}>
   <nav className={styles.actions} aria-label="Sertifikat amallari"><Link href="/en"><ArrowLeft size={16} />Jurnalga qaytish</Link>{isValid && <a href={`/api/certificates/${encodeURIComponent(cert.certificate_number)}/pdf`} target="_blank" rel="noopener noreferrer"><Download size={17} />PDF yuklab olish</a>}</nav>
   <div className={`${styles.status} ${!isValid ? styles.revoked : ''}`} role="status">{isValid ? <CheckCircle2 size={20} /> : <XCircle size={20} />}<div><strong>{isValid ? 'Jurnal reyestrida tasdiqlangan' : 'Sertifikat bekor qilingan'}</strong><p>{isValid ? 'Ushbu sahifa sertifikatning joriy holatini ko‘rsatadi.' : cert.revoked_reason || 'Bu sertifikat amaldagi nashr tasdig‘i sifatida ishlatilmaydi.'}</p></div></div>
   <article className={styles.paper}>
    {!isValid && <div className={styles.paperRevoked}><strong>BEKOR QILINGAN · REVOKED</strong><p>{cert.revoked_reason || "Bu sertifikat amaldagi nashr tasdig‘i sifatida ishlatilmaydi."}</p></div>}
    <header className={styles.header}><div><p className={styles.kicker}>ILMIY NASHR · PUBLICATION RECORD</p><p className={styles.brand}>{cert.journal_name || settings.journal_name}</p>{isValidIssn(settings.issn_online) && <p className={styles.small}>ISSN Online {settings.issn_online}</p>}</div><span className={styles.monogram}>AGM<span>JOURNAL</span></span></header>
    <div className={styles.title}><p className={styles.kicker}>CERTIFICATE OF PUBLICATION</p><h1>Nashr sertifikati</h1><p>Ilmiy maqolaning jurnalda nashr etilganligini tasdiqlaydi</p></div>
    <section className={styles.recipient}><p className={styles.kicker}>MUALLIF · AUTHOR</p><h2>{cert.author_name}</h2>{cert.author_affiliation && <p>{cert.author_affiliation}</p>}</section>
    <section className={styles.article}><p className={styles.kicker}>NASHR ETILGAN MAQOLA · PUBLISHED ARTICLE</p><h3>{cert.article_title}</h3></section>
    <dl className={styles.metadata}>{[['Jild / Volume', cert.issue_volume], ['Son / Issue', cert.issue_number], ['Yil / Year', cert.issue_year], ['Nashr sanasi / Date', cert.issue_date]].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <section className={styles.services} aria-labelledby="certificate-services-heading">
     <div className={styles.servicesHeading}><p className={styles.kicker} id="certificate-services-heading">NASHR XIZMATLARI · SUPPORTED SERVICES</p><span>Scholarly publishing workflows</span></div>
     <ul className={styles.serviceList}>{certificateServices.map(service => <li key={service.name}><div className={styles.serviceLogo}><Image src={service.asset} width={service.width} height={service.height} alt={service.name} unoptimized />{service.name === 'ORCID' && <strong>ORCID</strong>}</div><p>{service.caption}</p></li>)}</ul>
     <p className={styles.serviceNote}>Logotiplar qo‘llab-quvvatlanadigan nashr xizmatlarini bildiradi; jurnalning indekslanganligi yoki ushbu tashkilotlar tasdig‘ini anglatmaydi.</p>
    </section>
    <footer className={styles.registry}><div><p className={styles.kicker}>SERTIFIKAT REYESTRI</p><strong>{cert.certificate_number}</strong><p>Tekshiruv kodi: <span>{cert.verification_code}</span></p><p className={styles.small}>Nashriyot: {settings.publisher || settings.journal_name}</p></div><a className={styles.qr} href={verificationUrl} aria-label="Sertifikatning reyestr yozuvini ochish"><Image src={qrCode} unoptimized width={96} height={96} alt="Sertifikatning tekshirish sahifasi QR kodi" /><span>SCAN TO VERIFY</span></a><div className={styles.editorial}><strong>Jurnal tahririyati</strong><span>{isValid ? 'Nashr yozuvi tasdiqlangan' : 'BEKOR QILINGAN'}</span><a href={verificationUrl}>Sertifikatni tekshirish →</a></div></footer>
   </article>
   <p className={styles.note}>Sertifikat nashr yozuvini tasdiqlaydi. Uning amaldagi holati jurnal reyestrida tekshiriladi.</p>
  </div>
 </main>;
}
