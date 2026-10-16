import React from 'react';
import { resolveSubjectId, subjectLabel } from '@/lib/subjects';
import Link from 'next/link';
import { Article, Language } from '@/types/journal';
import { getDictionary } from '@/lib/i18n/dictionaries';
import {
  Download,
  Calendar,
  BookMarked,
  ExternalLink,
  ArrowUpRight,
  User
} from 'lucide-react';

interface ArticleCardProps {
  article: Article;
  lang: Language;
  theme?: 'light' | 'dark';
}

export function ArticleCard({ article, lang, theme = 'light' }: ArticleCardProps) {
  const dict = getDictionary(lang);

  const title = lang === 'en' && article.title_en
    ? article.title_en
    : lang === 'ru' && article.title_ru
      ? article.title_ru
      : article.title_uz;

  const abstract = lang === 'en' && article.abstract_en
    ? article.abstract_en
    : lang === 'ru' && article.abstract_ru
      ? article.abstract_ru
      : article.abstract_uz;

  const keywords = (lang === 'en' && article.keywords_en && article.keywords_en.length > 0)
    ? article.keywords_en
    : (lang === 'ru' && article.keywords_ru && article.keywords_ru.length > 0)
      ? article.keywords_ru
      : (article.keywords_uz || []);

  const authors = article.authors || [];
  const issueLabel = lang === 'uz' ? 'Jild' : lang === 'ru' ? 'Том' : 'Vol';
  const numberLabel = lang === 'uz' ? 'Son' : lang === 'ru' ? '№' : 'No';
  const openAccessLabel = lang === 'uz' ? 'Ochiq kirish (CC BY 4.0)' : lang === 'ru' ? 'Открытый доступ (CC BY 4.0)' : 'Open Access (CC BY 4.0)';

  return (
    <article data-home-reveal={theme === 'dark' ? '' : undefined} className={`article-card ${theme === 'dark' ? 'article-card-dark home-lift' : ''} group bg-white rounded-xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-navy-800/40 transition-all duration-300 flex flex-col overflow-hidden relative`}>
      {/* Top accent gradient bar on hover */}
      <div className="h-1 w-full shrink-0 bg-teal-700 opacity-80 group-hover:opacity-100 transition-opacity" />

      <div className="p-5 space-y-3 flex-1">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="article-type px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase bg-teal-50 text-teal-800 border border-teal-200/80">
              {article.article_type.replace('_', ' ')}
            </span>
            {article.issue && (
              <span className="article-issue px-2.5 py-1 rounded-md text-[11px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 flex items-center gap-1.5">
                <BookMarked className="w-3.5 h-3.5 text-slate-500" />
                <span>{issueLabel} {article.issue.volume}, {numberLabel} {article.issue.issue_number} ({article.issue.year})</span>
              </span>
            )}
          </div>

          <div className="article-date flex items-center gap-1.5 text-slate-600 text-xs font-medium">
            <Calendar className="w-3.5 h-3.5" />
            <span>{article.publication_date || article.created_at.split('T')[0]}</span>
          </div>
        </div>

        <Link href={`/${lang}/subjects/${resolveSubjectId(article)}`} className="text-xs font-semibold text-teal-800 underline underline-offset-4">{subjectLabel(resolveSubjectId(article), lang)}</Link>
        {/* Title */}
        <h3 className="article-title text-lg sm:text-xl font-extrabold text-navy-900 group-hover:text-teal-700 transition-colors leading-snug">
          <Link href={`/${lang}/article/${article.slug}`} className="flex items-start justify-between gap-2">
            <span className="line-clamp-3">{title}</span>
            <ArrowUpRight className="article-arrow w-4 h-4 text-slate-300 group-hover:text-teal-700 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 mt-1" />
          </Link>
        </h3>

        {/* Authors */}
        <div className="space-y-1">
          <div className="article-authors flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <User className="w-3.5 h-3.5 text-teal-700 shrink-0" />
            <span className="line-clamp-1">
              {authors.map((a, i) => (
                <span key={a.id || i}>
                  {a.full_name}
                  {a.is_corresponding && <sup className="text-teal-700 font-black ml-0.5">*</sup>}
                  {i < authors.length - 1 ? ', ' : ''}
                </span>
              ))}
            </span>
          </div>

          {authors[0]?.affiliation && (
            <p className="article-affiliation text-[11px] text-slate-500 italic line-clamp-1 pl-5">
              {authors[0].affiliation}
            </p>
          )}
        </div>

        {/* Abstract */}
        <p className="article-abstract text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-2">
          {abstract}
        </p>

        {/* Keywords */}
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {keywords.slice(0, 4).map((kw, i) => (
              <span
                key={i}
                className="article-keyword text-[11px] px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600 font-medium group-hover:border-slate-300 transition-colors"
              >
                #{kw}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer bar */}
      <div className="article-footer bg-slate-50/80 border-t border-slate-100 px-5 py-3 mt-auto flex flex-wrap items-center justify-between gap-3 text-xs">
        {article.doi ? (
          <span className="article-doi font-mono text-slate-500 text-[11px] truncate max-w-[220px]">
            DOI: <strong className="text-slate-700">{article.doi}</strong>
          </span>
        ) : (
          <span className="article-access text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            {openAccessLabel}
          </span>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <Link
            href={`/api/articles/${article.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="article-pdf inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-teal-700" />
            <span>PDF</span>
          </Link>

          <Link
            href={`/${lang}/article/${article.slug}`}
            className="article-read inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white font-bold transition-all shadow-sm"
          >
            <span>{dict.common.readMore}</span>
            <ExternalLink className="w-3 h-3 text-white" />
          </Link>
        </div>
      </div>
    </article>
  );
}
