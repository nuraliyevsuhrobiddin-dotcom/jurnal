import React from 'react';
import Link from 'next/link';
import { Language } from '@/types/journal';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getPublishedArticles, getAllIssues } from '@/lib/db';
import { ArticleCard } from '@/components/article/ArticleCard';
import { Search, Filter, BookOpen } from 'lucide-react';

export default async function ArticlesCatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string; issue?: string }>;
}) {
  const { lang } = await params;
  const { q, issue } = await searchParams;
  const currentLang = (['uz', 'en', 'ru'].includes(lang) ? lang : 'uz') as Language;
  const dict = getDictionary(currentLang);

  const [articles, issues] = await Promise.all([
    getPublishedArticles({ query: q, issueId: issue }),
    getAllIssues(),
  ]);

  return (
    <div className="journal-container py-10 space-y-8">
      {/* Title & Filter Header */}
      <div className="space-y-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-navy-900">
          {dict.nav.articles}
        </h1>
        <p className="text-sm text-slate-500">
          AGM Journal ilmiy nashrida chop etilgan barcha peer-reviewed maqolalar katalogi
        </p>

        {/* Search & Issue Filter Form */}
        <form method="GET" className="bg-white p-4 rounded-xl academic-border academic-shadow flex flex-col md:flex-row gap-3">
          <div className="relative flex-1 flex items-center bg-slate-50 rounded-lg border border-slate-200 px-3">
            <Search className="w-4 h-4 text-slate-500 mr-2" />
            <input
              type="text"
              name="q"
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
              <option value="">{dict.common.all} sonlar</option>
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

      {/* Results Count */}
      <div className="text-xs text-slate-500 font-medium">
        Jami topilgan maqolalar: <strong className="text-slate-900">{articles.length}</strong>
        {q && <span> (Qidiruv: &ldquo;{q}&rdquo;)</span>}
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
            Boshqa so‘rov bilan qidirib ko‘ring yoki barcha sonlar filtrini tanlang.
          </p>
          <Link
            href={`/${currentLang}/articles`}
            className="inline-block mt-2 text-xs font-semibold text-teal-700 hover:underline"
          >
            Filtrni tozalash
          </Link>
        </div>
      )}
    </div>
  );
}
