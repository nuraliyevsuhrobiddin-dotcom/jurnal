import { publicPageMetadata } from '@/lib/page-metadata';
import React from 'react';
import { IssueCoverImage } from '@/components/issues/IssueCoverImage';
import Link from 'next/link';
import { Language } from '@/types/journal';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getCurrentIssue, getPublishedArticles } from '@/lib/db';
import { ArticleCard } from '@/components/article/ArticleCard';
import { BookOpen, Calendar, CheckCircle2 } from 'lucide-react';

export default async function CurrentIssuePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const currentLang = (['uz', 'en', 'ru'].includes(lang) ? lang : 'uz') as Language;
  const dict = getDictionary(currentLang);

  const issue = await getCurrentIssue();
  if (!issue) return <div className="journal-container interior-page current-page py-10 space-y-8"><header><p className="interior-kicker">AGM JOURNAL</p><h1>{dict.nav.current}</h1></header><section className="interior-empty"><BookOpen size={32} /><h2>{currentLang === 'en' ? 'The next issue is in preparation' : currentLang === 'ru' ? 'Новый выпуск готовится к публикации' : 'Navbatdagi son nashrga tayyorlanmoqda'}</h2><p>{currentLang === 'en' ? 'Published research is available in the article catalog and archive.' : currentLang === 'ru' ? 'Опубликованные исследования доступны в каталоге статей и архиве.' : 'Chop etilgan tadqiqotlarni maqolalar katalogi va arxivdan topishingiz mumkin.'}</p><Link href={`/${currentLang}/articles`}>{dict.nav.articles} →</Link></section></div>;

  const articles = await getPublishedArticles({ issueId: issue.id });

  const title = currentLang === 'en' && issue.title_en
    ? issue.title_en
    : currentLang === 'ru' && issue.title_ru
      ? issue.title_ru
      : issue.title_uz;

  const description = currentLang === 'en' && issue.description_en
    ? issue.description_en
    : currentLang === 'ru' && issue.description_ru
      ? issue.description_ru
      : issue.description_uz;
  const coverUrl = issue.cover_image_url && !/^\/images\/issue-\d+-cover\.png$/i.test(issue.cover_image_url) ? issue.cover_image_url : '/images/issue-cover-default.svg';

  return (
    <div className="journal-container interior-page current-page issue-page py-8 space-y-6">
      {/* Issue Banner */}
      <div className="bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 issue-banner rounded-xl text-white p-5 sm:p-6 shadow-sm flex items-start sm:items-center gap-4 sm:gap-6">
        {/* Cover badge */}
        <div className="shrink-0 space-y-1.5">
          <div className="relative h-36 w-28 overflow-hidden rounded-md border border-gold-400/60 shadow-2xl sm:h-44 sm:w-32">
            <IssueCoverImage src={coverUrl} alt={`${title || dict.nav.current} — ${currentLang === 'en' ? 'issue cover' : currentLang === 'ru' ? 'обложка выпуска' : 'jurnal muqovasi'}`} className="object-cover" />
          </div>
          <p className="text-center text-[9px] font-bold text-gold-300">Vol. {issue.volume} · No. {issue.issue_number} · {issue.year}</p>
        </div>


        <div className="space-y-3 flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{dict.sections.currentIssue}</span>
          </div>

          <h1 className="text-2xl sm:text-[32px] font-bold tracking-tight">
            {title}
          </h1>

          <p className="text-sm text-slate-200 leading-relaxed max-w-2xl">
            {description}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-2">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-gold-400" />
              {dict.article.publishedDate}: <strong>{issue.publication_date}</strong>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-gold-400" />
              {dict.stats.articlesCount}: <strong>{articles.length}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Table of Contents Section */}
      <div className="space-y-5">
        <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-navy-900">
            {currentLang === 'ru' ? 'Содержание' : currentLang === 'en' ? 'Table of contents' : 'Mundarija'}
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            {dict.stats.articlesCount}: {articles.length}
          </span>
        </div>

        {articles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} lang={currentLang} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-10 bg-white rounded-xl border border-slate-200">
            {dict.common.noResults}
          </p>
        )}
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return publicPageMetadata((['en','uz','ru'].includes(lang) ? lang : 'en') as Language, '/current', 'Current issue', 'Read the current issue of AGM Journal and its published research articles.');
}
