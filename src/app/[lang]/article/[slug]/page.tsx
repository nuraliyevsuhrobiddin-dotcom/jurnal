import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Language } from '@/types/journal';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getArticleBySlug, getJournalSettings } from '@/lib/db';
import { getArticleMetadata, generateArticleJsonLd } from '@/lib/seo';
import { CitationBox } from '@/components/article/CitationBox';
import {
  Download,
  Calendar,
  BookMarked,
  Eye,
  ShieldCheck,
  FileText,
  User,
  BookOpen
} from 'lucide-react';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  const currentLang = (['uz', 'en', 'ru'].includes(lang) ? lang : 'uz') as Language;
  const [article, settings] = await Promise.all([
    getArticleBySlug(slug),
    getJournalSettings(),
  ]);

  if (!article) return { title: 'Maqola topilmadi | AGM Journal' };
  return getArticleMetadata(article, currentLang, settings);
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  const currentLang = (['uz', 'en', 'ru'].includes(lang) ? lang : 'uz') as Language;
  const dict = getDictionary(currentLang);

  const [article, settings] = await Promise.all([
    getArticleBySlug(slug),
    getJournalSettings(),
  ]);

  if (!article) {
    notFound();
  }

  const title = currentLang === 'en' && article.title_en
    ? article.title_en
    : currentLang === 'ru' && article.title_ru
      ? article.title_ru
      : article.title_uz;

  const abstract = currentLang === 'en' && article.abstract_en
    ? article.abstract_en
    : currentLang === 'ru' && article.abstract_ru
      ? article.abstract_ru
      : article.abstract_uz;

  const keywords = (currentLang === 'en' && article.keywords_en && article.keywords_en.length > 0)
    ? article.keywords_en
    : (currentLang === 'ru' && article.keywords_ru && article.keywords_ru.length > 0)
      ? article.keywords_ru
      : (article.keywords_uz || []);

  const authors = article.authors || [];
  const jsonLd = generateArticleJsonLd(article, settings);

  return (
    <div className="journal-container py-10 space-y-8">
      {/* JSON-LD for Google Scholar / Indexing */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link href={`/${currentLang}`} className="hover:text-navy-900 transition-colors">
          Bosh sahifa
        </Link>
        <span>/</span>
        <Link href={`/${currentLang}/articles`} className="hover:text-navy-900 transition-colors">
          Maqolalar
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-medium truncate max-w-xs">{title}</span>
      </nav>

      {/* Article Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-10 space-y-6 relative overflow-hidden">
        {/* Top Decorative Border */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gold-500" />

        {/* Badges Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-100 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full font-bold bg-teal-50 text-teal-700 border border-teal-200">
              {article.article_type.replace('_', ' ').toUpperCase()}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 font-semibold text-slate-700">
              Til: <strong className="uppercase">{article.original_language}</strong>
            </span>
            {article.issue && (
              <span className="px-3 py-1 rounded-full bg-slate-100 font-semibold text-slate-800 flex items-center gap-1.5 border border-slate-200">
                <BookMarked className="w-3.5 h-3.5 text-gold-700" />
                Vol. {article.issue.volume}, No. {article.issue.issue_number} ({article.issue.year})
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-slate-500">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              {article.publication_date || article.created_at.split('T')[0]}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              {article.views_count} ko‘rildi
            </span>
          </div>
        </div>

        {/* Retraction Alert */}
        {article.status === 'withdrawn' && (
          <div className="bg-rose-50 border-2 border-rose-300 text-rose-900 p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2">
            <span>⚠️</span>
            <span>{dict.article.retractedNotice}: {article.retraction_reason || 'Tahririyat qarori bilan qaytarib olingan'}</span>
          </div>
        )}

        {/* Article Title */}
        <h1 className="text-2xl sm:text-4xl font-black text-navy-900 leading-tight">
          {title}
        </h1>

        {/* Authors Section with Affiliation Cards */}
        <div className="space-y-3 pt-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
            Mualliflar va tashkilotlar
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {authors.map((author, idx) => (
              <div
                key={author.id || idx}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-teal-700/40 transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-navy-900 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-gold-700" />
                    <span>{author.full_name}</span>
                  </span>
                  {author.is_corresponding && (
                    <span className="text-[10px] bg-gold-100 text-gold-800 px-2 py-0.5 rounded-full font-bold">
                      {dict.article.corresponding}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-snug">
                  {author.affiliation}, {author.country}
                </p>
                {author.orcid && (
                  <p className="text-[11px] text-teal-700 font-mono pt-1">
                    ORCID: <a href={`https://orcid.org/${author.orcid}`} target="_blank" rel="noopener noreferrer" className="hover:underline font-bold">{author.orcid}</a>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <div className="space-y-1 text-xs">
            {article.doi && (
              <p className="font-semibold text-slate-700">
                DOI: <a href={`https://doi.org/${article.doi}`} target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:underline font-mono">{article.doi}</a>
              </p>
            )}
            <p className="text-slate-500">
              Sahifalar: {article.page_first}–{article.page_last || article.page_first} • Litsenziya: {article.license}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/api/articles/${article.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gold-500 hover:bg-gold-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl transition-all hover:scale-102"
            >
              <Download className="w-4 h-4" />
              <span>{dict.article.downloadPdf}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Abstract Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-10 space-y-4">
        <h2 className="text-lg font-bold text-navy-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-gold-700" />
          <span>{dict.article.abstract}</span>
        </h2>

        {/* Full text abstract for scholar crawler */}
        <div className="text-slate-700 text-sm sm:text-base leading-relaxed space-y-4">
          <p>{abstract}</p>
        </div>

        {/* Keywords */}
        <div className="pt-4 border-t border-slate-100">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
            {dict.article.keywords}:
          </span>
          <div className="flex flex-wrap gap-2">
            {keywords.map((kw, i) => (
              <span
                key={i}
                className="text-xs px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-semibold"
              >
                #{kw}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Citation Box Component */}
      <CitationBox article={article} />

      {/* References Section */}
      {article.references_list && article.references_list.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-10 space-y-4">
          <h2 className="text-lg font-bold text-navy-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-gold-700" />
            <span>{dict.article.references} ({article.references_list.length})</span>
          </h2>
          <ol className="list-decimal list-inside space-y-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed font-serif pl-1">
            {article.references_list.map((ref, idx) => (
              <li key={idx} className="pl-1">
                {ref}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Author Certificates Banner */}
      <div className="bg-gradient-to-r from-gold-50 to-teal-50 border border-gold-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-base font-bold text-gold-950 flex items-center justify-center sm:justify-start gap-2">
            <ShieldCheck className="w-5 h-5 text-gold-700" />
            <span>{lang === 'uz' ? 'Mualliflik sertifikati va QR-kod orqali tekshiruv' : lang === 'ru' ? 'Сертификат автора и проверка по QR-коду' : 'Author certificates and QR verification'}</span>
          </h3>
          <p className="text-xs text-gold-800/90 leading-relaxed max-w-lg">
            {lang === 'uz' ? 'Har bir muallif AGM Journal elektron sertifikatini oladi. Sertifikatdagi QR-kod uning haqiqiyligini tekshirishga yordam beradi.' : lang === 'ru' ? 'Каждый автор получает электронный сертификат AGM Journal. QR-код на сертификате позволяет проверить его подлинность.' : 'Each author receives an AGM Journal electronic certificate. Its QR code can be used to verify authenticity.'}
          </p>
        </div>
        <Link
          href="/verify-certificate"
          className="px-6 py-3 rounded-2xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold shrink-0 transition-colors shadow-md"
        >
          {lang === 'uz' ? 'Sertifikatni tekshirish' : lang === 'ru' ? 'Проверить сертификат' : 'Verify certificate'}
        </Link>
      </div>
    </div>
  );
}
