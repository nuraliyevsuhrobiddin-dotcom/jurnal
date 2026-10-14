import React from 'react';
import Link from 'next/link';
import { IssueCoverImage } from '@/components/issues/IssueCoverImage';
import { Language } from '@/types/journal';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getAllIssues, getPublishedArticles } from '@/lib/db';
import {  Calendar, ArrowRight, Archive } from 'lucide-react';

export default async function ArchivePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const currentLang = (['uz', 'en', 'ru'].includes(lang) ? lang : 'uz') as Language;
  const dict = getDictionary(currentLang);

  const [issues, allArticles] = await Promise.all([
    getAllIssues(),
    getPublishedArticles(),
  ]);

  // Group issues by year
  const issuesByYear: Record<number, typeof issues> = {};
  issues.forEach((iss) => {
    if (!issuesByYear[iss.year]) {
      issuesByYear[iss.year] = [];
    }
    issuesByYear[iss.year].push(iss);
  });

  const sortedYears = Object.keys(issuesByYear).map(Number).sort((a, b) => b - a);

  return (
    <div className="journal-container py-10 space-y-10">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-navy-900 flex items-center gap-3">
          <Archive className="w-8 h-8 text-gold-700" />
          <span>{dict.nav.archive}</span>
        </h1>
        <p className="text-sm text-slate-500">
          {currentLang === 'en' ? 'Complete chronological archive of AGM Journal volumes and issues.' : currentLang === 'ru' ? 'Полный архив томов и выпусков AGM Journal.' : 'AGM Journal jild va sonlarining to‘liq xronologik arxivi.'}
        </p>
      </div>

      <div className="space-y-12">
        {sortedYears.map((year) => (
          <div key={year} className="space-y-6">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-navy-900 bg-slate-100 px-4 py-1 rounded-lg">
                {year} Yil
              </h2>
              <div className="h-px bg-slate-200 flex-1"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {issuesByYear[year].map((iss) => {
                const articleCount = allArticles.filter(a => a.issue_id === iss.id).length;
                const title = currentLang === 'en' && iss.title_en
                  ? iss.title_en
                  : currentLang === 'ru' && iss.title_ru
                    ? iss.title_ru
                    : iss.title_uz;

                return (
                  <div
                    key={iss.id}
                    className="overflow-hidden rounded-xl academic-border academic-shadow bg-white flex flex-col justify-between hover:border-teal-700 transition-all"
                  >
                    <div className="issue-archive-cover relative h-56 overflow-hidden bg-navy-900">
                      <IssueCoverImage src={iss.cover_image_url} alt={`${title || `${iss.volume}-jild, ${iss.issue_number}-son`} muqovasi`} className="object-cover transition-transform duration-500 hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-navy-950/95 via-navy-950/25 to-navy-950/10" />
                      <div className="absolute inset-x-4 bottom-4 text-white"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-gold-300">AGM Journal · {iss.year}</p><p className="mt-1 line-clamp-2 font-serif text-lg font-bold">{title}</p></div>
                    </div>
                    <div className="flex flex-1 flex-col justify-between p-5">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-teal-700 uppercase">
                          {currentLang === 'uz' ? `Jild ${iss.volume}, son ${iss.issue_number}` : currentLang === 'ru' ? `Том ${iss.volume}, выпуск ${iss.issue_number}` : `Volume ${iss.volume}, issue ${iss.issue_number}`}
                        </span>
                        {iss.is_current && (
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-semibold">
                            {currentLang === 'uz' ? 'Joriy son' : currentLang === 'ru' ? 'Текущий выпуск' : 'Current issue'}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-navy-900 leading-snug">
                        {title}
                      </h3>

                      <p className="text-xs text-slate-500 line-clamp-2">
                        {(currentLang === 'en' ? iss.description_en : currentLang === 'ru' ? iss.description_ru : iss.description_uz) || ''}
                      </p>

                      <div className="text-xs text-slate-500 flex items-center gap-2 pt-2">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{iss.publication_date}</span>
                        <span>•</span>
                        <span>{currentLang === 'en' ? `${articleCount} articles` : currentLang === 'ru' ? `Статей: ${articleCount}` : `${articleCount} ta maqola`}</span>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100">
                      <Link
                        href={`/${currentLang}/articles?issue=${iss.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-900 hover:text-teal-700 transition-colors"
                      >
                        <span>{currentLang === 'en' ? 'Browse articles' : currentLang === 'ru' ? 'Смотреть статьи' : 'Maqolalarni ko‘rish'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
