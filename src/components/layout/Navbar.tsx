'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Language, JournalSettings } from '@/types/journal';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isValidIssn } from '@/lib/identifiers';
import {
  BookOpen,
  Menu,
  X,
  ChevronDown,
  Award,
  Lock,
  Globe,
  Search,
  FileText,
  ShieldCheck,
  Scale,
  Sparkles,
  Layers,
  BookMarked,
  Info,
  Send,
  CheckCircle2,
  Library
} from 'lucide-react';

interface NavbarProps {
  lang: Language;
  settings?: JournalSettings;
}

export function Navbar({ lang, settings }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dict = getDictionary(lang);
  const unverifiedIssn = lang === 'en' ? 'not verified' : lang === 'ru' ? 'не подтверждён' : 'tekshirilmoqda';
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMouseEnter = (menu: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveDropdown(menu);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  const getLanguageUrl = (targetLang: Language) => {
    if (!pathname) return `/${targetLang}`;
    const segments = pathname.split('/');
    if (segments[1] === 'uz' || segments[1] === 'en' || segments[1] === 'ru') {
      segments[1] = targetLang;
      const query = searchParams.toString();
      return segments.join('/') + (query ? `?${query}` : '');
    }
    // Only public journal pages use a language prefix. Standalone routes such
    // as certificate verification retain their canonical path and query.
    return `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ''}`;
  };

  // Structured Mega Menus
  const menuStructure = [
    {
      id: 'about',
      label: dict.nav.about,
      items: [
        {
          href: `/${lang}/about`,
          title: dict.nav.about,
          desc: lang === 'en' ? 'Aims, scope and journal information' : lang === 'ru' ? 'Цели, тематика и сведения о журнале' : 'Jurnal maqsadlari va yo‘nalishlari',
          icon: Info,
        },
        {
          href: `/${lang}/editorial-board`,
          title: dict.nav.editorial,
          desc: lang === 'en' ? 'Editorial team and responsibilities' : lang === 'ru' ? 'Редакционная коллегия и обязанности' : 'Tahririyat hay’ati va vazifalari',
          icon: ShieldCheck,
        },
        {
          href: `/${lang}/indexing`,
          title: dict.nav.indexing,
          desc: lang === 'en' ? 'Indexing status and verifiable identifiers' : lang === 'ru' ? 'Статус индексации и проверяемые идентификаторы' : 'Indekslash holati va tekshiriladigan identifikatorlar',
          icon: Layers,
        },
      ]
    },
    {
      id: 'publications',
      label: lang === 'en' ? 'Publications' : lang === 'ru' ? 'Публикации' : 'Nashrlar',
      items: [
        {
          href: `/${lang}/articles`,
          title: dict.nav.articles,
          desc: lang === 'en' ? 'Browse published research' : lang === 'ru' ? 'Опубликованные исследования' : 'Chop etilgan tadqiqotlar',
          icon: FileText,
        },
        {
          href: `/${lang}/current`,
          title: dict.nav.current,
          desc: lang === 'en' ? 'Latest issue and contents' : lang === 'ru' ? 'Последний выпуск и содержание' : 'So‘nggi son va mundarija',
          icon: BookOpen,
        },
        {
          href: `/${lang}/archive`,
          title: dict.nav.archive,
          desc: lang === 'en' ? 'Volumes and issues by year' : lang === 'ru' ? 'Тома и выпуски по годам' : 'Yillar bo‘yicha jild va sonlar',
          icon: Library,
        },
      ]
    },
    {
      id: 'authors',
      label: lang === 'en' ? 'For authors' : lang === 'ru' ? 'Авторам' : 'Mualliflarga',
      items: [
        {
          href: `/${lang}/guidelines`,
          title: dict.nav.guidelines,
          desc: lang === 'en' ? 'Preparing and submitting your manuscript' : lang === 'ru' ? 'Подготовка и подача рукописи' : 'Qo‘lyozmani tayyorlash va yuborish',
          icon: BookMarked,
        },
        {
          href: `/${lang}/apc`,
          title: dict.nav.apc,
          desc: lang === 'en' ? 'Fees, waivers and payment transparency' : lang === 'ru' ? 'Сборы, льготы и прозрачность оплаты' : 'To‘lovlar, imtiyozlar va shaffoflik',
          icon: Sparkles,
        },
        {
          href: `/${lang}/open-access`,
          title: dict.nav.openAccess,
          desc: lang === 'en' ? 'Licensing and reader access' : lang === 'ru' ? 'Лицензирование и доступ читателей' : 'Litsenziyalash va o‘quvchilar kirishi',
          icon: CheckCircle2,
        },
      ]
    },
    {
      id: 'policies',
      label: dict.nav.policies,
      items: [
        { href: `/${lang}/policies`, title: lang === 'en' ? 'All journal policies' : lang === 'ru' ? 'Все политики журнала' : 'Barcha jurnal siyosatlari', desc: lang === 'en' ? 'Complete documents and PDF handbook' : lang === 'ru' ? 'Полные документы и руководство PDF' : 'To‘liq hujjatlar va PDF qo‘llanma', icon: BookMarked },
        {
          href: `/${lang}/peer-review`,
          title: dict.nav.peerReview,
          desc: lang === 'en' ? 'Independent assessment and editorial decisions' : lang === 'ru' ? 'Независимая оценка и решения редакции' : 'Mustaqil ekspertiza va tahririyat qarorlari',
          icon: ShieldCheck,
        },
        {
          href: `/${lang}/ethics`,
          title: dict.nav.ethics,
          desc: lang === 'en' ? 'Authorship, conflicts and research integrity' : lang === 'ru' ? 'Авторство, конфликты и научная добросовестность' : 'Mualliflik, manfaatlar va ilmiy halollik',
          icon: Scale,
        },
        {
          href: `/${lang}/plagiarism`,
          title: dict.nav.plagiarism,
          desc: lang === 'en' ? 'Originality checks and handling concerns' : lang === 'ru' ? 'Проверка оригинальности и рассмотрение нарушений' : 'Originallik tekshiruvi va muammolarni ko‘rib chiqish',
          icon: FileText,
        },
      ]
    }
  ];

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-navy-950/95 backdrop-blur-md shadow-2xl border-b border-navy-800/60'
        : 'bg-navy-900 border-b border-navy-800'
    }`}>
      {/* Top Academic Micro-Header */}
      <div className="bg-midnight text-[11px] text-slate-300 py-1 px-4 border-b border-slate-800/80">
        <div className="journal-width flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-mono text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>ISSN: {isValidIssn(settings?.issn_online) ? settings?.issn_online : unverifiedIssn} (Online)</span>
            </span>
            <span className="hidden md:inline text-slate-600">|</span>
            <span className="hidden md:inline font-mono text-slate-400">ISSN: {isValidIssn(settings?.issn_print) ? settings?.issn_print : unverifiedIssn} (Print)</span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="hidden sm:inline text-gold-400/90 font-medium">{lang === 'en' ? 'Publication ethics · Open research' : lang === 'ru' ? 'Публикационная этика · Открытая наука' : 'Nashr etikasi · Ochiq ilm'}</span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <Link
              href="/verify-certificate"
              className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-gold-500/10 hover:bg-gold-500/20 text-gold-300 font-semibold transition-all border border-gold-500/20"
            >
              <Award className="w-3.5 h-3.5 text-gold-400" />
              <span>{dict.nav.verifyCertificate}</span>
            </Link>

            <span className="text-slate-700">|</span>

            <Link
              href="/admin"
              className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
            >
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Admin</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="journal-container">
        <div className="flex items-center justify-between h-18 gap-4">
          {/* Brand Logo & Crest */}
          <Link href={`/${lang}`} className="journal-brand flex items-center gap-3 group shrink-0 min-w-0 max-w-[340px]">
            <div className="relative">
              {/* Crest Frame */}
              <div className="w-12 h-12 rounded-xl bg-gold-500 p-0.5 shadow-lg group-hover:scale-105 transition-all duration-300">
                <div className="w-full h-full bg-navy-950 rounded-[10px] flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-gold-500/10 to-transparent pointer-events-none"></div>
                  <BookOpen className="w-6 h-6 text-gold-400 group-hover:rotate-3 transition-transform" />
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-gold-500 text-[8px] font-black flex items-center justify-center text-slate-950 border border-navy-950">
                ★
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans">
                  {settings?.journal_name?.replace(/\s*journal$/i, '') || 'AGM'}
                </span>
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-gold-400 font-serif italic">
                  JOURNAL
                </span>
              </div>
              <span className="hidden sm:block text-[9px] text-slate-300 tracking-wide uppercase font-semibold font-sans">
                {dict.hero.subtitle}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links with Rich Dropdowns */}
          <nav className="hidden xl:flex items-center gap-0 whitespace-nowrap">
            <Link
              href={`/${lang}`}
              className={`px-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                pathname === `/${lang}`
                  ? 'text-gold-400 bg-white/5'
                  : 'text-slate-200 hover:text-white hover:bg-white/5'
              }`}
            >
              {dict.nav.home}
            </Link>

            {menuStructure.map((menu) => (
              <div
                key={menu.id}
                className="relative"
                onMouseEnter={() => handleMouseEnter(menu.id)}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  type="button"
                  aria-expanded={activeDropdown === menu.id}
                  onClick={() => setActiveDropdown(activeDropdown === menu.id ? null : menu.id)}
                  onKeyDown={(event) => { if (event.key === "Escape") setActiveDropdown(null); }}
                  className={`flex items-center gap-1 px-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                    activeDropdown === menu.id
                      ? 'text-gold-400 bg-white/5'
                      : 'text-slate-200 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{menu.label}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    activeDropdown === menu.id ? 'rotate-180 text-gold-400' : 'text-slate-400'
                  }`} />
                </button>

                {/* Dropdown Card */}
                {activeDropdown === menu.id && (
                  <div
                    className="absolute top-full left-0 mt-1 w-80 max-w-[calc(100vw-2rem)] bg-navy-900 border border-navy-700/80 rounded-2xl shadow-2xl p-2.5 space-y-1 z-50 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150"
                  >
                    {menu.items.map((item) => {
                      const Icon = item.icon;
                      const isItemActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setActiveDropdown(null)}
                          className={`flex items-start gap-3 p-2.5 rounded-xl transition-all ${
                            isItemActive
                              ? 'bg-gold-500/15 border border-gold-500/30 text-white'
                              : 'hover:bg-white/5 text-slate-200'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-midnight border border-slate-700/60 flex items-center justify-center shrink-0 mt-0.5 text-gold-400 shadow-inner">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white leading-snug">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                              {item.desc}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            <Link
              href={`/${lang}/contact`}
              className={`px-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                pathname === `/${lang}/contact`
                  ? 'text-gold-400 bg-white/5'
                  : 'text-slate-200 hover:text-white hover:bg-white/5'
              }`}
            >
              {dict.nav.contact}
            </Link>
          </nav>

          {/* Right Header: Search & Language Switcher & Submit CTA */}
          <div className="journal-header-actions flex items-center gap-2 sm:gap-3">
            {/* Quick search button */}
            <Link
              href={`/${lang}/articles`}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors hidden sm:flex items-center justify-center"
              title={dict.hero.searchButton}
            >
              <Search className="w-4 h-4" />
            </Link>

            {/* Language Switcher Pills */}
            <div className="journal-language-switcher flex items-center bg-midnight rounded-xl p-1 border border-slate-800 shadow-inner">
              <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1" />
              {(['uz', 'en', 'ru'] as Language[]).map((l) => (
                <Link
                  key={l}
                  href={getLanguageUrl(l)}
                  className={`px-2 py-1 text-xs font-bold rounded-lg uppercase transition-all ${
                    lang === l
                      ? 'bg-gold-500 hover:bg-gold-400 text-slate-950 shadow-md font-extrabold'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {l}
                </Link>
              ))}
            </div>

            {/* Submit Manuscript CTA */}
            <Link
              href={`/${lang}/submit`}
              className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-slate-950 text-xs font-bold shadow-lg transition-all hover:scale-102"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{lang === 'ru' ? 'Подать статью' : lang === 'en' ? 'Submit article' : 'Maqola berish'}</span>
            </Link>

            {/* Mobile Menu Trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-xl bg-white/5 text-slate-200 hover:text-white hover:bg-white/10"
              aria-label={lang === 'en' ? 'Navigation menu' : lang === 'ru' ? 'Меню навигации' : 'Navigatsiya menyusi'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div id="mobile-navigation" className="xl:hidden bg-navy-950 border-t border-navy-800 max-h-[85vh] overflow-y-auto px-4 py-6 space-y-6 shadow-2xl">
          <Link
            href={`/${lang}`}
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-bold text-white px-3 py-2 rounded-lg hover:bg-white/5"
          >
            {dict.nav.home}
          </Link>

          {menuStructure.map((group) => (
            <div key={group.id} className="space-y-2">
              <span className="text-[11px] font-bold text-gold-400 uppercase tracking-wider px-3 block">
                {group.label}
              </span>
              <div className="grid grid-cols-1 gap-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-slate-200"
                    >
                      <Icon className="w-4 h-4 text-gold-400" />
                      <div className="text-xs font-bold text-white">
                        {item.title}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="pt-4 border-t border-slate-800 space-y-2"><Link href={`/${lang}/submit`} onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 bg-gold-500 text-slate-950 font-bold rounded-lg">{lang === 'en' ? 'Submit a manuscript' : lang === 'ru' ? 'Подать рукопись' : 'Maqola yuborish'}</Link>
            <Link
              href={`/${lang}/contact`}
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-bold text-white px-3 py-2 rounded-lg hover:bg-white/5"
            >
              {dict.nav.contact}
            </Link>
            <Link
              href="/verify-certificate"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 text-xs font-bold text-gold-300 bg-gold-500/10 border border-gold-500/30 px-3 py-2.5 rounded-xl"
            >
              <Award className="w-4 h-4 text-gold-400" />
              <span>{dict.nav.verifyCertificate}</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
