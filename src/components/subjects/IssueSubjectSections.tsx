import Link from 'next/link';
import { subjectCollections, resolveSubjectId, subjectLabel } from '@/lib/subjects';
import type { Article, Issue, Language } from '@/types/journal';
import { ArticleCard } from '@/components/article/ArticleCard';
import { SubjectCover } from './SubjectCover';
import styles from './subjects.module.css';

export function IssueSubjectSections({ articles, issue, lang }: { articles: Article[]; issue: Issue; lang: Language }) {
  const labels = lang === 'en' ? { collection: 'Subject collection', browse: 'Explore this collection', download: 'Download collection PDF', count: 'articles' } : lang === 'ru' ? { collection: 'Тематическая коллекция', browse: 'Открыть коллекцию', download: 'Скачать PDF коллекции', count: 'статей' } : { collection: 'Mavzuli to‘plam', browse: 'To‘plamni ko‘rish', download: 'Yo‘nalish to‘plami PDF', count: 'maqola' };
  return <div className={styles.issueSections}>{subjectCollections.map(subject => {
    const papers = articles.filter(article => resolveSubjectId(article) === subject.id);
    if (!papers.length) return null;
    const href = `/${lang}/subjects/${subject.id}?issue=${issue.id}`;
    return <section key={subject.id} className={styles.issueSection}><div className={styles.sectionTop}><Link href={href}><SubjectCover subjectId={subject.id} issueId={issue.id} alt={`AGM Journal — ${subject.labels.en}`} /></Link><div><p className={styles.eyebrow}>{labels.collection}</p><h3><Link href={href}>{subjectLabel(subject.id, lang)}</Link></h3><p>{papers.length} {lang === 'en' && papers.length === 1 ? 'article' : labels.count} · Vol. {issue.volume} / No. {issue.issue_number} / {issue.year}</p><div className={styles.sectionLinks}><Link href={href}>{labels.browse} &rarr;</Link><a href={`/api/issues/${issue.id}/pdf?subject=${subject.id}`}>{labels.download} &darr;</a></div></div></div><div className={styles.articles}>{papers.map(article => <ArticleCard key={article.id} article={article} lang={lang} />)}</div></section>;
  })}</div>;
}
