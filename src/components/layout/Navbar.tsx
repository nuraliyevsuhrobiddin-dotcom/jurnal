'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { Language, JournalSettings } from '@/types/journal';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { submissionTranslator } from '@/lib/submission-copy';

export function Navbar({ lang, settings }: { lang: Language; settings?: JournalSettings }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const search = useSearchParams();
  const dict = getDictionary(lang);
  const links = [['articles', dict.nav.articles], ['current', dict.nav.current], ['archive', dict.nav.archive], ['about', dict.nav.about], ['editorial-board', dict.nav.editorial], ['policies', dict.nav.policies]];
  const submit = submissionTranslator(lang)('Submit a manuscript');
  return <header className="scholar-header">
    <div className="scholar-utility"><div className="journal-container"><span>{lang === 'uz' ? 'Ko‘p tarmoqli ilmiy jurnal' : lang === 'ru' ? 'Междисциплинарный научный журнал' : 'Multidisciplinary research journal'}</span><Link href={`/${lang}/track`}>{lang === 'uz' ? 'Maqola holati' : lang === 'ru' ? 'Статус статьи' : 'Track manuscript'}</Link><Link href={`/${lang}/contact`}>{dict.nav.contact}</Link><Link href={`/${lang}/verify-certificate`}>{dict.nav.verifyCertificate}</Link></div></div>
    <div className="journal-container scholar-main"><Link href={`/${lang}`} className="scholar-brand" aria-label={settings?.journal_name || 'AGM Journal'}><strong>AGM</strong><span>JOURNAL</span></Link><div className="scholar-actions"><nav aria-label={lang === 'uz' ? 'Til' : lang === 'ru' ? 'Язык' : 'Language'} className="scholar-languages">{(['en', 'uz', 'ru'] as Language[]).map(code => <Link key={code} href={`${pathname.replace(/^\/(uz|en|ru)(?=\/|$)/, `/${code}`)}${search.toString() ? `?${search}` : ''}`} hrefLang={code} aria-current={lang === code ? 'true' : undefined}>{code.toUpperCase()}</Link>)}</nav><Link className="scholar-submit" href={`/${lang}/submit`}>{submit}<ArrowUpRight size={16} /></Link><button type="button" className="scholar-menu" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="scholar-navigation" aria-label={lang === 'uz' ? 'Menyu' : lang === 'ru' ? 'Меню' : 'Menu'}>{open ? <X /> : <Menu />}</button></div></div>
    <nav id="scholar-navigation" className={`scholar-navigation ${open ? 'is-open' : ''}`} aria-label={lang === 'uz' ? 'Asosiy menyu' : lang === 'ru' ? 'Основное меню' : 'Main navigation'}><div className="journal-container">{links.map(([path, label]) => <Link key={path} href={`/${lang}/${path}`} aria-current={pathname === `/${lang}/${path}` ? 'page' : undefined} onClick={() => setOpen(false)}>{label}</Link>)}<Link href={`/${lang}/guidelines`} onClick={() => setOpen(false)}>{dict.nav.guidelines}</Link></div></nav>
  </header>;
}
