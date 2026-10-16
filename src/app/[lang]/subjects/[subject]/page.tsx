import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Download, ArrowUpRight } from 'lucide-react';
import type { Language } from '@/types/journal';
import { findSubject, resolveSubjectId, subjectLabel } from '@/lib/subjects';
import { getAllIssues, getPublishedArticles } from '@/lib/db';
import { publicPageMetadata } from '@/lib/page-metadata';
import { SubjectCover } from '@/components/subjects/SubjectCover';
import { ArticleCard } from '@/components/article/ArticleCard';
import styles from '@/components/subjects/subjects.module.css';

type Props = { params: Promise<{ lang: string; subject: string }>; searchParams: Promise<{ issue?: string | string[] }> };
export async function generateMetadata({ params }: Props) {
  const { lang, subject: id } = await params;
  if (!['en', 'uz', 'ru'].includes(lang) || !findSubject(id)) notFound();
  return publicPageMetadata(lang as Language, `/subjects/${id}`, subjectLabel(id, lang as Language)!, 'Peer-reviewed, open-access research in this subject collection within AGM Journal.');
}
const copy = {
  en: { home: 'Research catalog', section: 'AGM JOURNAL / SUBJECT COLLECTION', intro: 'Explore peer-reviewed research in this discipline. This collection brings together articles published within AGM Journal and its regular issues.', all: 'All editions', editions: 'Browse editions', papers: 'Research articles', count: 'articles', download: 'Download collection PDF', issue: 'View complete issue', empty: 'This collection is accepting research', emptyText: 'Articles will appear here after editorial review and publication. Browse another edition or submit a manuscript for consideration.', submit: 'Submit a manuscript' },
  uz: { home: 'Ilmiy nashrlar katalogi', section: 'AGM JOURNAL / MAVZULI TO‘PLAM', intro: 'Ushbu yo‘nalishdagi ilmiy tadqiqotlar bilan tanishing. To‘plam AGM Journal sonlarida nashr etilgan maqolalarni birlashtiradi.', all: 'Barcha sonlar', editions: 'Jurnal sonlari', papers: 'Ilmiy maqolalar', count: 'maqola', download: 'Yo‘nalish to‘plami PDF', issue: 'To‘liq jurnal soni', empty: 'Ushbu yo‘nalishga maqolalar qabul qilinmoqda', emptyText: 'Maqolalar tahririy tekshiruv va nashrdan keyin shu yerda ko‘rinadi. Boshqa sonni tanlang yoki maqolangizni yuboring.', submit: 'Maqola yuborish' },
  ru: { home: 'Каталог исследований', section: 'AGM JOURNAL / ТЕМАТИЧЕСКАЯ КОЛЛЕКЦИЯ', intro: 'Рецензируемые исследования по этому направлению. Коллекция объединяет статьи, опубликованные в выпусках AGM Journal.', all: 'Все выпуски', editions: 'Выпуски журнала', papers: 'Научные статьи', count: 'статей', download: 'Скачать PDF коллекции', issue: 'Полный выпуск журнала', empty: 'Принимаются статьи по этому направлению', emptyText: 'Статьи появятся после редакционной проверки и публикации. Выберите другой выпуск или отправьте рукопись.', submit: 'Отправить рукопись' },
};
export default async function SubjectCollectionPage({ params, searchParams }: Props) {
  const { lang, subject: id } = await params;
  if (!['en', 'uz', 'ru'].includes(lang) || !findSubject(id)) notFound();
  const language = lang as Language;
  const query = await searchParams;
  const issueId = typeof query.issue === 'string' ? query.issue : undefined;
  const issues = await getAllIssues();
  const issue = issueId ? issues.find(item => item.id === issueId) : undefined;
  if (issueId && !issue) notFound();
  const articles = (await getPublishedArticles(issue ? { issueId: issue.id } : undefined)).filter(article => resolveSubjectId(article) === id);
  const t = copy[language];
  return <div className={`journal-container ${styles.page}`}>
    <nav className={styles.breadcrumb} aria-label={t.home}><Link href={`/${lang}`}>{t.home}</Link><span aria-hidden="true">/</span><span>{subjectLabel(id, language)}</span></nav>
    <header className={styles.hero}><SubjectCover subjectId={id} issueId={issue?.id} alt={`AGM Journal — ${subjectLabel(id, 'en')}`} priority /><div className={styles.heroCopy}><p className={styles.eyebrow}>{t.section}</p><h1>{subjectLabel(id, language)}</h1><p className={styles.intro}>{t.intro}</p><div className={styles.edition}><strong>{articles.length} {language === 'en' && articles.length === 1 ? 'article' : t.count}</strong><span>{issue ? `Vol. ${issue.volume} · No. ${issue.issue_number} · ${issue.year}` : t.all}</span></div>{issue && <div className={styles.actions}>{articles.length > 0 && <a href={`/api/issues/${issue.id}/pdf?subject=${id}`} className={styles.download}><Download size={16} />{t.download}</a>}<Link href={`/${lang}/issue/${issue.id}`} className={styles.download}>{t.issue}<ArrowUpRight size={16} /></Link></div>}</div></header>
    <nav className={styles.editions} aria-label={t.editions}><strong>{t.editions}</strong><Link href={`/${lang}/subjects/${id}`} aria-current={!issue ? 'page' : undefined}>{t.all}</Link>{issues.map(edition => <Link key={edition.id} href={`/${lang}/subjects/${id}?issue=${edition.id}`} aria-current={issue?.id === edition.id ? 'page' : undefined}>{edition.year} / {edition.volume}.{edition.issue_number}</Link>)}</nav>
    <section className={styles.research}><div className={styles.heading}><h2>{t.papers}</h2><span>{articles.length} {language === 'en' && articles.length === 1 ? 'article' : t.count}</span></div>{articles.length ? <div className={styles.articles}>{articles.map(article => <ArticleCard key={article.id} article={article} lang={language} />)}</div> : <div className={styles.empty}><h3>{t.empty}</h3><p>{t.emptyText}</p><Link href={`/${lang}/submit`}>{t.submit} &rarr;</Link></div>}</section>
  </div>;
}
