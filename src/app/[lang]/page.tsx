import React from 'react';
import Link from 'next/link';
import { Language } from '@/types/journal';
import { getDictionary } from '@/lib/i18n/dictionaries';
import {
  getPublishedArticles,
  getCurrentIssue,
  getEditorialBoard,
  getJournalSettings
} from '@/lib/db';
import { ArticleCard } from '@/components/article/ArticleCard';
import { HomeAtmosphere } from '@/components/home/HomeAtmosphere';
import { IssueCoverImage } from '@/components/issues/IssueCoverImage';
import { isValidIssn } from '@/lib/identifiers';

import {
  Search,
  BookOpen,
  Award,
  Globe2,
  ArrowRight,
  Sparkles,
  CheckCircle,
  Send,
  Library
} from 'lucide-react';

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const currentLang = (['uz', 'en', 'ru'].includes(lang) ? lang : 'uz') as Language;
  const dict = getDictionary(currentLang);

  const [articles, currentIssue, editorialBoard, settings] = await Promise.all([
    getPublishedArticles({ limit: 4 }),
    getCurrentIssue(),
    getEditorialBoard(),
    getJournalSettings(),
  ]);
  const currentIssueCover = currentIssue?.cover_image_url && /^\/images\/issue-\d+-cover\.png$/i.test(currentIssue.cover_image_url)
    ? '/images/issue-cover-default.svg'
    : currentIssue?.cover_image_url || '/images/issue-cover-default.svg';

  return (
    <HomeAtmosphere>
      {/* Scenic Uzbekistan backdrop with live journal content. */}
      <section className="home-hero-backdrop">
        <div className={`journal-width home-hero-layout`}>
        <div className={`space-y-5 home-hero-content`}>
          {/* Top prestige badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-gold-500/15 via-white/10 to-transparent backdrop-blur-md border border-gold-500/30 text-xs text-gold-300 font-semibold shadow-inner">
            <Sparkles className="w-4 h-4 text-gold-400 animate-pulse" />
            <span>Open Access · Peer review · {isValidIssn(settings.issn_online) ? `ISSN: ${settings.issn_online}` : lang === 'uz' ? 'ISSN: tekshirilmoqda' : lang === 'ru' ? 'ISSN: не подтверждён' : 'ISSN: not verified'}</span>
          </div>

          {/* Main Title */}
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1]">
              AGM <span className="text-gold-300 font-serif italic">JOURNAL</span>
            </h1>
            <p className={`text-xs sm:text-sm uppercase tracking-[0.25em] font-bold home-hero-subtitle`}>
              {dict.hero.subtitle}
            </p>
          </div>

          <p className={`text-base sm:text-lg max-w-3xl font-normal leading-relaxed home-hero-description`}>
            {dict.hero.description}
          </p>

          {/* Search Box with Category Pills */}
          <div className="max-w-3xl pt-2 space-y-3">
            <form
              action={`/${currentLang}/articles`}
              method="GET"
              className="relative flex items-center bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-2 border border-white/20 focus-within:ring-4 focus-within:ring-gold-500/30 transition-all"
            >
              <Search className="w-5 h-5 text-slate-400 ml-3.5 shrink-0" />
              <input
                type="text"
                name="q"
                aria-label={dict.hero.searchPlaceholder}
                placeholder={dict.hero.searchPlaceholder}
                className="w-full px-4 py-3 text-sm text-slate-900 placeholder-slate-400 bg-transparent focus:outline-none font-medium"
              />
              <button
                type="submit"
                className="bg-gradient-to-r from-navy-900 to-navy-800 hover:from-navy-800 hover:to-navy-700 text-white px-7 py-3 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all shrink-0 hover:scale-102"
              >
                {dict.hero.searchButton}
              </button>
            </form>

            {/* Quick search tags */}
            <div className={`flex flex-wrap items-center gap-2 text-xs home-hero-topics`}>
              <span className="font-semibold">{currentLang === 'en' ? 'Suggested topics:' : currentLang === 'ru' ? 'Популярные темы:' : 'Tavsiya etilgan mavzular:'}</span>
              <Link href={`/${currentLang}/articles?q=sun'iy+intellekt`} className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 transition-colors">
                #Sun‘iy intellekt
              </Link>
              <Link href={`/${currentLang}/articles?q=iqtisodiyot`} className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 transition-colors">
                #Raqamli iqtisodiyot
              </Link>
              <Link href={`/${currentLang}/articles?q=energiya`} className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 transition-colors">
                #Yashil energetika
              </Link>
              <Link href={`/${currentLang}/articles?q=biotexnologiya`} className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 transition-colors">
                #Biotexnologiya
              </Link>
            </div>
          </div>

          {/* Quick CTA Buttons */}
          <div className={`flex flex-wrap items-center gap-3 pt-2 text-xs sm:text-sm home-hero-actions`}>
            <Link
              href={`/${currentLang}/current`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gold-500 hover:bg-gold-400 text-slate-950 font-bold transition-all shadow-xl hover:scale-102"
            >
              <BookOpen className="w-4 h-4" />
              <span>{dict.hero.currentIssueBtn}</span>
            </Link>

            <Link
              href={`/${currentLang}/guidelines`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold border border-white/20 transition-all backdrop-blur-md hover:scale-102"
            >
              <Send className="w-4 h-4 text-gold-400" />
              <span>{dict.hero.submitBtn}</span>
            </Link>

            <Link
              href="/verify-certificate"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-700/20 hover:bg-teal-700/30 text-teal-300 font-bold border border-teal-400/30 transition-all backdrop-blur-md"
            >
              <Award className="w-4 h-4 text-teal-400" />
              <span>Sertifikat tekshiruvi</span>
            </Link>
          </div>
        </div>
        {currentIssue && (
          <Link
            href={`/${currentLang}/current`}
            className="home-hero-issue group"
            aria-label={`${dict.sections.currentIssue}: ${currentLang === 'en' && currentIssue.title_en ? currentIssue.title_en : currentLang === 'ru' && currentIssue.title_ru ? currentIssue.title_ru : currentIssue.title_uz || `Volume ${currentIssue.volume}, issue ${currentIssue.issue_number}, ${currentIssue.year}`}`}
          >
            <span className="home-hero-issue-art" aria-hidden="true">
              <span className="home-hero-issue-pattern" />
              <IssueCoverImage src={currentIssueCover} alt="" className="object-cover transition-transform duration-500 group-hover:scale-105" />
              <span className="home-hero-issue-scrim" />
              <span className="home-hero-issue-top"><span>AGM</span><span>JOURNAL</span></span>
              <span className="home-hero-issue-title">
                {currentLang === 'en' && currentIssue.title_en ? currentIssue.title_en : currentLang === 'ru' && currentIssue.title_ru ? currentIssue.title_ru : currentIssue.title_uz || dict.sections.currentIssue}
              </span>
              <span className="home-hero-issue-mark" aria-hidden="true">✦</span>
              <span className="home-hero-issue-bottom">
                <span>{currentLang === 'uz' ? 'Jild' : currentLang === 'ru' ? 'Том' : 'Volume'} {currentIssue.volume} · {currentLang === 'uz' ? 'Son' : currentLang === 'ru' ? 'Выпуск' : 'Issue'} {currentIssue.issue_number}</span>
                <strong>{currentIssue.year}</strong>
              </span>
            </span>
            <span className="home-hero-issue-caption"><span className="home-hero-issue-dot" />{dict.sections.currentIssue}<span aria-hidden="true">↗</span></span>
          </Link>
        )}
        </div>
      </section>

      {/* 2. JOURNAL PRINCIPLES */}
      <section className="journal-container !-mt-8 relative z-20" data-home-reveal>
        <div className="home-glass rounded-3xl p-5 sm:p-7">
          <div className="mb-5 text-center sm:text-left">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-300">
              {currentLang === 'uz' ? 'AGM Journal' : currentLang === 'ru' ? 'AGM Journal' : 'AGM Journal'}
            </p>
            <h2 className="mt-1 text-xl sm:text-2xl font-black text-white">
              {currentLang === 'uz' ? 'Ilmiy nashr tamoyillari' : currentLang === 'ru' ? 'Принципы научного издания' : 'Our publishing principles'}
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Link href={`/${currentLang}/about`} className="group rounded-2xl border border-white/10 bg-white/[0.045] p-4 transition-colors hover:bg-white/[0.09]">
              <span className="mb-3 inline-flex rounded-xl bg-teal-300/10 p-2.5 text-teal-200"><BookOpen className="h-5 w-5" /></span>
              <h3 className="font-bold text-white">{currentLang === 'uz' ? 'Ochiq ilmiy nashr' : currentLang === 'ru' ? 'Открытая наука' : 'Open access'}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">{currentLang === 'uz' ? 'Nashr etilgan maqolalarni bepul o‘qing va ilmiy natijalardan foydalaning.' : currentLang === 'ru' ? 'Читайте опубликованные статьи и используйте научные результаты бесплатно.' : 'Read published articles and access research results without a subscription.'}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-gold-300">{currentLang === 'uz' ? 'Jurnal haqida' : currentLang === 'ru' ? 'О журнале' : 'About the journal'} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></span>
            </Link>
            <Link href={`/${currentLang}/peer-review`} className="group rounded-2xl border border-white/10 bg-white/[0.045] p-4 transition-colors hover:bg-white/[0.09]">
              <span className="mb-3 inline-flex rounded-xl bg-gold-300/10 p-2.5 text-gold-200"><CheckCircle className="h-5 w-5" /></span>
              <h3 className="font-bold text-white">{currentLang === 'uz' ? 'Taqriz va tahrir' : currentLang === 'ru' ? 'Рецензирование и редактура' : 'Peer review'}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">{currentLang === 'uz' ? 'Maqolalar tahririyat ko‘rigidan va ilmiy taqriz jarayonidan o‘tadi.' : currentLang === 'ru' ? 'Статьи проходят редакционную проверку и научное рецензирование.' : 'Submissions go through editorial screening and scholarly review.'}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-gold-300">{currentLang === 'uz' ? 'Taqriz siyosati' : currentLang === 'ru' ? 'Политика рецензирования' : 'Review policy'} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></span>
            </Link>
            <Link href={`/${currentLang}/guidelines`} className="group rounded-2xl border border-white/10 bg-white/[0.045] p-4 transition-colors hover:bg-white/[0.09]">
              <span className="mb-3 inline-flex rounded-xl bg-sky-300/10 p-2.5 text-sky-200"><Globe2 className="h-5 w-5" /></span>
              <h3 className="font-bold text-white">{currentLang === 'uz' ? 'Xalqaro ilmiy muloqot' : currentLang === 'ru' ? 'Международный научный диалог' : 'International scholarship'}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">{currentLang === 'uz' ? 'Turli fan yo‘nalishlaridagi tadqiqotlar va mualliflar uchun yagona ilmiy maydon.' : currentLang === 'ru' ? 'Единая научная площадка для исследований и авторов разных дисциплин.' : 'A shared platform for research and authors across multiple disciplines.'}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-gold-300">{currentLang === 'uz' ? 'Maqola talablari' : currentLang === 'ru' ? 'Требования к статьям' : 'Submission guidelines'} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></span>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. CURRENT ISSUE DETAILS */}
      {currentIssue && (
        <section className="journal-container" data-home-reveal>
          <div className="home-current home-glass rounded-3xl text-white p-5 sm:p-8 flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden">
            <div className="relative z-10 w-40 shrink-0 sm:w-44 lg:w-48">
              <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-gold-300/50 bg-navy-950 shadow-2xl ring-1 ring-black/20">
                <IssueCoverImage
                  src={currentIssueCover}
                  alt={`${currentIssue.title_uz || dict.sections.currentIssue} muqovasi`}
                  className="object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
              <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-wider text-gold-300">
                {currentLang === 'uz' ? 'Jild' : currentLang === 'ru' ? 'Том' : 'Vol.'} {currentIssue.volume} · {currentLang === 'uz' ? 'Son' : currentLang === 'ru' ? 'Вып.' : 'No.'} {currentIssue.issue_number} · {currentIssue.year}
              </p>
            </div>

            <div className="space-y-3 flex-1 relative z-10 min-w-0 w-full">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>{dict.sections.currentIssue}</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                {currentLang === 'en' && currentIssue.title_en
                  ? currentIssue.title_en
                  : currentLang === 'ru' && currentIssue.title_ru
                    ? currentIssue.title_ru
                    : currentIssue.title_uz}
              </h2>

              <p className="text-sm text-slate-200 leading-relaxed max-w-2xl font-light">
                {currentLang === 'en' && currentIssue.description_en
                  ? currentIssue.description_en
                  : currentLang === 'ru' && currentIssue.description_ru
                    ? currentIssue.description_ru
                    : currentIssue.description_uz}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href={`/${currentLang}/current`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gold-500 hover:bg-gold-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-xl hover:scale-102"
                >
                  <span>{dict.sections.exploreIssue}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href={`/${currentLang}/archive`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs sm:text-sm transition-all border border-white/20 backdrop-blur-md"
                >
                  <Library className="w-4 h-4 text-gold-400" />
                  <span>{dict.nav.archive}</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. LATEST PUBLISHED ARTICLES SECTION */}
      <section className="home-recent-publications" data-home-reveal>
        <div className="journal-container space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-gold-700">
              {currentLang === 'uz' ? 'Yangi nashrlar' : currentLang === 'ru' ? 'Новые публикации' : 'Recent publications'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-navy-900">
              {dict.sections.latestArticles}
            </h2>
          </div>

          <Link
            href={`/${currentLang}/articles`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold transition-all shadow-sm"
          >
            <span>{dict.sections.viewAllArticles}</span>
            <ArrowRight className="w-3.5 h-3.5 text-gold-400" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {articles.map((article) => (
            <div key={article.id} className="home-recent-card home-lift" data-home-reveal><ArticleCard article={article} lang={currentLang} theme="light" /></div>
          ))}
        </div>
        </div>
      </section>

      {/* 5. EDITORIAL LEADERSHIP SPOTLIGHT */}
      <section className="home-editorial-band py-10 px-4 border-y border-gold-300/20" data-home-reveal>
        <div className="journal-width space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gold-300">
              {currentLang === 'uz' ? 'Tahririyat hay’ati' : currentLang === 'ru' ? 'Редакционная коллегия' : 'Editorial board'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              {dict.sections.editorialHighlights}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              {currentLang === 'uz' ? 'O‘zbekiston Fanlar akademiyasi va xalqaro universitetlarning yetakchi olimlari.' : currentLang === 'ru' ? 'Ведущие учёные Академии наук Узбекистана и международных университетов.' : 'Leading scholars from the Academy of Sciences of Uzbekistan and international universities.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {editorialBoard.slice(0, 3).map((member) => (
              <div
                key={member.id}
                data-home-reveal
                className="home-editorial-card home-glass home-lift rounded-2xl p-5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gold-300 bg-gold-300/10 px-2.5 py-1 rounded-md border border-gold-300/25 inline-block">
                    {member.academic_title || member.role.replace('_', ' ').toUpperCase()}
                  </span>
                  <h3 className="text-lg font-bold text-white">
                    {member.full_name}
                  </h3>
                  <p className="text-xs text-slate-200 font-semibold">
                    {member.academic_degree}
                  </p>
                  <p className="text-xs text-slate-300 italic">
                    {member.affiliation}, {member.country}
                  </p>
                </div>

                {member.orcid && (
                  <div className="mt-5 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-teal-200 font-mono">
                    <span>ORCID: {member.orcid}</span>
                    <Award className="w-3.5 h-3.5 text-emerald-300" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-center pt-4">
            <Link
              href={`/${currentLang}/editorial-board`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold transition-all shadow-md"
            >
              <span>{dict.nav.editorial} ({currentLang === 'uz' ? 'to‘liq ro‘yxat' : currentLang === 'ru' ? 'полный список' : 'full list'})</span>
              <ArrowRight className="w-3.5 h-3.5 text-gold-400" />
            </Link>
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION FOR AUTHORS */}
      <section className="journal-container" data-home-reveal>
        <div className="home-author-cta home-glass rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs font-black uppercase tracking-widest text-gold-300 bg-gold-300/10 px-3 py-1 rounded-full">
              {currentLang === 'uz' ? 'Maqolalar qabuli ochiq' : currentLang === 'ru' ? 'Приём статей открыт' : 'Submissions are open'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black">
              {currentLang === 'uz' ? 'Tadqiqotingizni AGM Journal’da nashr eting' : currentLang === 'ru' ? 'Опубликуйте своё исследование в AGM Journal' : 'Publish your research in AGM Journal'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
              {currentLang === 'uz' ? 'Maqolangiz xolis taqrizdan o‘tadi. Nashr etilgan maqolaga DOI beriladi, har bir muallif sertifikat oladi.' : currentLang === 'ru' ? 'Статьи проходят независимое рецензирование. Опубликованным материалам присваивается DOI, каждому автору выдаётся сертификат.' : 'Articles undergo independent peer review. Published work receives a DOI, and each author receives a certificate.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link
              href={`/${currentLang}/guidelines`}
              className="px-6 py-3 rounded-xl bg-gold-500 hover:bg-gold-400 text-slate-950 text-xs font-bold shadow-xl transition-all text-center"
            >
              {currentLang === 'uz' ? 'Talablar mualliflar uchun' : currentLang === 'ru' ? 'Требования к авторам' : 'Author guidelines'}
            </Link>
            <Link
              href={`/${currentLang}/contact`}
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/25 text-white text-xs font-bold shadow-md transition-all text-center"
            >
              {currentLang === 'uz' ? 'Tahririyat bilan bog‘lanish' : currentLang === 'ru' ? 'Связаться с редакцией' : 'Contact the editors'}
            </Link>
          </div>
        </div>
      </section>
    </HomeAtmosphere>
  );
}
