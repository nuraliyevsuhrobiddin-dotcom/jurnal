import React from 'react';
import { findSubject } from '@/lib/subjects';
import { getArticlePage } from '@/lib/article-page';
import Link from 'next/link';
import { Language } from '@/types/journal';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getAllIssues } from '@/lib/db';
import { ArticleCard } from '@/components/article/ArticleCard';
import { Search, Filter, BookOpen } from 'lucide-react';

export default async function ArticlesCatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string; issue?: string; subject?: string; page?: string }>;
}) {
  const { lang } = await params;
  const { q, issue, subject, page: pageParam } = await searchParams;
  const currentLang = (['uz', 'en', 'ru'].includes(lang) ? lang : 'uz') as Language;
  const dict = getDictionary(currentLang);

  const [result, issues] = await Promise.all([
    getArticlePage({ query: q, issueId: issue, subject, page: pageParam }),
    getAllIssues(),
  ]);

  const collection = findSubject(subject);
  const { articles, total, page, size } = result;
  const pageUrl = (number: number) => {
    const values = new URLSearchParams();
    if (q) values.set('q', q);
    if (issue) values.set('issue', issue);
    if (collection) values.set('subject', collection.id);
    values.set('page', String(number));
    return `/${currentLang}/articles?${values}`;
  };
  const t = currentLang === 'en' ? { description: 'Published research from AGM Journal.', issues: 'All issues', results: 'Articles found', search: 'Search', help: 'Try another query or select all issues.', reset: 'Clear filters', collection: 'Subject collection' } : currentLang === 'ru' ? { description: 'Опубликованные исследования AGM Journal.', issues: 'Все выпуски', results: 'Найдено статей', search: 'Поиск', help: 'Измените запрос или выберите все выпуски.', reset: 'Сбросить фильтры', collection: 'Тематическая коллекция' } : { description: 'AGM Journal nashrida chop etilgan ilmiy maqolalar.', issues: 'Barcha sonlar', results: 'Topilgan maqolalar', search: 'Qidiruv', help: 'Boshqa so‘rov bilan qidiring yoki barcha sonlarni tanlang.', reset: 'Filtrlarni tozalash', collection: 'Mavzuli to‘plam' };
  return (
    <div className="journal-container interior-page articles-page py-10 space-y-8">
      {/* Title & Filter Header */}
      <div className="space-y-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-navy-900">
          {dict.nav.articles}
        </h1>
        <p className="text-sm text-slate-500">
          {t.description}
        </p>

        {/* Search & Issue Filter Form */}
        <form method="GET" className="bg-white p-4 rounded-xl academic-border academic-shadow flex flex-col md:flex-row gap-3">
          {collection && <input type="hidden" name="subject" value={collection.id} />}
          <div className="relative flex-1 flex items-center bg-slate-50 rounded-lg border border-slate-200 px-3">
            <Search className="w-4 h-4 text-slate-500 mr-2" />
            <input
              type="text"
              name="q"
              aria-label={dict.hero.searchPlaceholder}
              defaultValue={q || ''}
              placeholder={dict.hero.searchPlaceholder}
              className="w-full py-2 bg-transparent text-sm text-slate-900 focus:outline-none"
            />
          </div>

          <div className="w-full md:w-64 flex items-center bg-slate-50 rounded-lg border border-slate-200 px-3">
            <Filter className="w-4 h-4 text-slate-500 mr-2" />
            <select
              name="issue"
              aria-label={currentLang === 'en' ? 'Filter by journal issue' : currentLang === 'ru' ? 'Фильтр по выпуску журнала' : 'Jurnal soni bo‘yicha filtrlash'}
              defaultValue={issue || ''}
              className="w-full py-2 bg-transparent text-sm text-slate-900 focus:outline-none"
            >
              <option value="">{t.issues}</option>
              {issues.map((iss) => (
                <option key={iss.id} value={iss.id}>
                  Vol. {iss.volume}, No. {iss.issue_number} ({iss.year})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="px-6 py-2 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold transition-colors"
          >
            {dict.hero.searchButton}
          </button>
        </form>
      </div>

      {collection && <div className="border-l-2 border-teal-700 pl-4"><p className="text-xs text-slate-500">{t.collection} · AGM Journal</p><h2 className="text-xl text-navy-900">{collection.labels[currentLang]}</h2></div>}
       {/* Results Count */}
      <div className="text-xs text-slate-500 font-medium">
        {t.results}: <strong className="text-slate-900">{total}</strong>
        {q && <span> ({t.search}: &ldquo;{q}&rdquo;)</span>}
      </div>

      {/* Articles List or Empty State */}
      {articles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} lang={currentLang} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl academic-border p-12 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">
            {dict.common.noResults}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {t.help}
          </p>
          <Link
            href={`/${currentLang}/articles`}
            className="inline-block mt-2 text-xs font-semibold text-teal-700 hover:underline"
          >
            {t.reset}
          </Link>
        </div>
      )}
      {(total > size || page > 1) && <nav aria-label={currentLang === 'uz' ? 'Sahifalar' : currentLang === 'ru' ? 'Страницы' : 'Pages'} className="flex items-center justify-between gap-4 border-t border-slate-200 pt-5 text-sm">
        {page > 1 ? <Link href={pageUrl(page - 1)} rel="prev">← {currentLang === 'uz' ? 'Oldingi' : currentLang === 'ru' ? 'Назад' : 'Previous'}</Link> : <span />}
        <span>{page} / {Math.max(1, Math.ceil(total / size))}</span>
        {page * size < total ? <Link href={pageUrl(page + 1)} rel="next">{currentLang === 'uz' ? 'Keyingi' : currentLang === 'ru' ? 'Далее' : 'Next'} →</Link> : <span />}
      </nav>}
    </div>
  );
}
