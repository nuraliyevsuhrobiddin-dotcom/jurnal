import React from 'react';
import { resolveSubjectId, subjectLabel } from '@/lib/subjects';
import { SubjectCover } from '@/components/subjects/SubjectCover';
import { notFound } from 'next/navigation';
import { ArticleView } from '@/components/article/ArticleView';
import Link from 'next/link';
import { Language } from '@/types/journal';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getArticleBySlug, getJournalSettings } from '@/lib/db';
import { getArticleMetadata, generateArticleJsonLd } from '@/lib/seo';
import { CitationBox } from '@/components/article/CitationBox';
import { isValidIssn } from '@/lib/identifiers';
import { Download, ArrowUpRight, ShieldCheck } from 'lucide-react';
import styles from './publication.module.css';
import { ArticleHistory } from '@/components/article/ArticleHistory';

export async function generateMetadata({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params;
  const currentLang = (['uz', 'en', 'ru'].includes(lang) ? lang : 'uz') as Language;
  const [article, settings] = await Promise.all([getArticleBySlug(slug), getJournalSettings()]);
  if (!article) return { title: 'Maqola topilmadi | AGM Journal' };
  return getArticleMetadata(article, currentLang, settings);
}

const labels = {
  uz: { home: 'Bosh sahifa', articles: 'Maqolalar', volume: 'Jild', issue: 'Son', pages: 'Sahifalar', year: 'Yil', pending: 'Belgilanmagan', id: 'Maqola ID', authors: 'Mualliflar va tashkilotlar', published: 'Nashr sanasi', language: 'Maqola tili', details: 'Nashr ma’lumotlari', license: 'Litsenziya', views: 'Ko‘rishlar', downloads: 'Yuklab olishlar', contents: 'Maqola bo‘limlari', certificate: 'Sertifikatni tekshirish', certificateText: 'Mualliflik sertifikatining haqiqiyligini QR-kod orqali tekshiring.', types: { original_research: 'Ilmiy tadqiqot', review: 'Sharh maqola', short_communication: 'Qisqa ilmiy xabar', case_study: 'Amaliy tadqiqot' } },
  en: { home: 'Home', articles: 'Articles', volume: 'Volume', issue: 'Issue', pages: 'Pages', year: 'Year', pending: 'Unassigned', id: 'Article ID', authors: 'Authors & affiliations', published: 'Published', language: 'Article language', details: 'Publication details', license: 'License', views: 'Views', downloads: 'Downloads', contents: 'In this article', certificate: 'Verify certificate', certificateText: 'Verify the authenticity of an author certificate using its QR code.', types: { original_research: 'Original research', review: 'Review article', short_communication: 'Short communication', case_study: 'Case study' } },
  ru: { home: 'Главная', articles: 'Статьи', volume: 'Том', issue: 'Номер', pages: 'Страницы', year: 'Год', pending: 'Не назначено', id: 'ID статьи', authors: 'Авторы и организации', published: 'Опубликовано', language: 'Язык статьи', details: 'Сведения о публикации', license: 'Лицензия', views: 'Просмотры', downloads: 'Загрузки', contents: 'В этой статье', certificate: 'Проверить сертификат', certificateText: 'Проверьте подлинность сертификата автора по QR-коду.', types: { original_research: 'Оригинальное исследование', review: 'Обзорная статья', short_communication: 'Краткое сообщение', case_study: 'Практическое исследование' } },
};

export default async function ArticleDetailPage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params;
  const currentLang = (['uz', 'en', 'ru'].includes(lang) ? lang : 'uz') as Language;
  const dict = getDictionary(currentLang);
  const text = labels[currentLang];
  const [article, settings] = await Promise.all([getArticleBySlug(slug), getJournalSettings()]);
  if (!article) notFound();
  const title = currentLang === 'en' && article.title_en ? article.title_en : currentLang === 'ru' && article.title_ru ? article.title_ru : article.title_uz;
  const abstract = currentLang === 'en' && article.abstract_en ? article.abstract_en : currentLang === 'ru' && article.abstract_ru ? article.abstract_ru : article.abstract_uz;
  const keywords = currentLang === 'en' && article.keywords_en?.length ? article.keywords_en : currentLang === 'ru' && article.keywords_ru?.length ? article.keywords_ru : article.keywords_uz || [];
  const pages = article.page_first != null ? (article.page_last != null && article.page_last !== article.page_first ? `${article.page_first}–${article.page_last}` : `${article.page_first}`) : text.pending;
  const articleId = `AGM-${article.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  const jsonLd = generateArticleJsonLd(article, settings, currentLang);

  return (
    <div className={`journal-container ${styles.publication}`}>
      {article.status === 'published' && <ArticleView id={article.id} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <nav className={styles.breadcrumb} aria-label={text.contents}>
        <Link href={`/${currentLang}`}>{text.home}</Link><span aria-hidden="true">/</span>
        <Link href={`/${currentLang}/articles`}>{text.articles}</Link><span aria-hidden="true">/</span><span>{articleId}</span>
      </nav>
      <header className={styles.masthead}>
        <div><p className={styles.eyebrow}>{settings.publisher}</p><Link href={`/${currentLang}`} className={styles.journalName}>{settings.journal_name}</Link></div>
        <div className={styles.journalIdentifiers}>{isValidIssn(settings.issn_online) && <span>eISSN {settings.issn_online}</span>}{isValidIssn(settings.issn_print) && <span>ISSN {settings.issn_print}</span>}</div>
      </header>
      <div className={styles.issueStrip}>
        <span>{article.issue ? `${text.volume} ${article.issue.volume} · ${text.issue} ${article.issue.issue_number} · ${article.issue.year}` : `${text.issue}: ${text.pending}`}</span>
        <span>{text.pages} {pages}<span className={styles.stripDivider}>|</span>{articleId}</span>
      </div>
      <div className={styles.layout}>
        <article className={styles.paper}>
          <header className={styles.articleHeader}>
            <div className={styles.articleKind}><span>{text.types[article.article_type]}</span><Link href={`/${currentLang}/open-access`}>{article.license}</Link></div>
            {article.status === 'withdrawn' && <p role="alert" className={styles.retraction}>{dict.article.retractedNotice}{article.retraction_reason && `: ${article.retraction_reason}`}</p>}
            <Link href={`/${currentLang}/subjects/${resolveSubjectId(article)}`} className="text-sm font-semibold text-teal-800 underline underline-offset-4">{subjectLabel(resolveSubjectId(article), currentLang)}</Link><h1>{title}</h1>
            <div className={styles.authorNames}>{(article.authors || []).map((author, index) => <span key={author.id || index}>{author.full_name}<sup>{index + 1}{author.is_corresponding ? '*' : ''}</sup>{index < (article.authors || []).length - 1 ? ',' : ''}</span>)}</div>
            {(article.authors || []).length > 0 && <div className={styles.affiliations} aria-label={text.authors}>{(article.authors || []).map((author, index) => <div key={author.id || index}><p><sup>{index + 1}</sup> {[author.affiliation, author.country].filter(Boolean).join(', ')}</p>{author.orcid && <a href={`https://orcid.org/${author.orcid}`} target="_blank" rel="noopener noreferrer">ORCID {author.orcid}<ArrowUpRight size={12} /></a>}{author.is_corresponding && <p className={styles.corresponding}>* {dict.article.corresponding}</p>}</div>)}</div>}
            {article.doi && <a className={styles.doi} href={`https://doi.org/${article.doi}`} target="_blank" rel="noopener noreferrer">https://doi.org/{article.doi}<ArrowUpRight size={14} /></a>}
            {article.status === 'published' && <Link href={`/${currentLang}/article/${article.slug}/fulltext.pdf`} target="_blank" rel="noopener noreferrer" className={`${styles.download} ${styles.mobileDownload}`}><Download size={18} />{dict.article.downloadPdf}<ArrowUpRight size={16} /></Link>}
          </header>
          <section id="abstract" className={styles.section}><h2>{dict.article.abstract}</h2><p className={styles.abstract}>{abstract}</p>{keywords.length > 0 && <div className={styles.keywords}><strong>{dict.article.keywords}</strong><p>{keywords.join(' · ')}</p></div>}</section>
          <section id="citation" className={styles.citation}><CitationBox article={article} lang={currentLang} /></section>
          {article.references_list?.length > 0 && <section id="references" className={styles.section}><h2>{dict.article.references}<span className={styles.count}>{article.references_list.length}</span></h2><ol className={styles.references}>{article.references_list.map((reference, index) => <li key={index}>{reference}</li>)}</ol></section>}
        </article>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarInner}>
            <Link href={`/${currentLang}/subjects/${resolveSubjectId(article)}${article.issue_id ? `?issue=${article.issue_id}` : ''}`} className="block max-w-40 mx-auto mb-5"><SubjectCover subjectId={resolveSubjectId(article)} issueId={article.issue_id} alt={`AGM Journal — ${subjectLabel(resolveSubjectId(article), 'en')}`} /></Link>
            {article.status === 'published' && <Link href={`/${currentLang}/article/${article.slug}/fulltext.pdf`} target="_blank" rel="noopener noreferrer" className={styles.download}><Download size={18} />{dict.article.downloadPdf}<ArrowUpRight size={16} /></Link>}
            <section className={styles.sideSection}><h2>{text.details}</h2><dl>
              <div><dt>{text.id}</dt><dd className={styles.identifier}>{articleId}</dd></div>
              {article.issue && <><div><dt>{text.volume} / {text.issue}</dt><dd>{article.issue.volume} / {article.issue.issue_number}</dd></div><div><dt>{text.year}</dt><dd>{article.issue.year}</dd></div></>}
              <div><dt>{text.pages}</dt><dd>{pages}</dd></div>
              {article.publication_date && <div><dt>{text.published}</dt><dd><time dateTime={article.publication_date}>{article.publication_date}</time></dd></div>}
              <div><dt>{text.language}</dt><dd>{article.original_language.toUpperCase()}</dd></div><div><dt>{text.license}</dt><dd><Link href={`/${currentLang}/open-access`}>{article.license}<ArrowUpRight size={12} /></Link></dd></div>
            </dl></section>
            <div className={styles.metrics}><div><strong>{article.views_count}</strong><span>{text.views}</span></div><div><strong>{article.downloads_count}</strong><span>{text.downloads}</span></div></div>
            <nav className={styles.sideSection} aria-label={text.contents}><h2>{text.contents}</h2><a href="#abstract">{dict.article.abstract}<ArrowUpRight size={13} /></a><a href="#citation">APA / MLA / Chicago / BibTeX<ArrowUpRight size={13} /></a>{article.references_list?.length > 0 && <a href="#references">{dict.article.references}<ArrowUpRight size={13} /></a>}</nav>
            <section className={styles.certificate}><ShieldCheck size={20} /><p>{text.certificateText}</p><Link href={`/${currentLang}/verify-certificate`}>{text.certificate}<ArrowUpRight size={13} /></Link></section>
          </div>
        </aside>
      </div>
      <ArticleHistory article={article} lang={currentLang} />
    </div>
  );
}
