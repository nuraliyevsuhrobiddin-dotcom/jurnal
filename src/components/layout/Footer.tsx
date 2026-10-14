import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import type { Language, JournalSettings } from '@/types/journal';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isValidIssn } from '@/lib/identifiers';
import { policyIds } from '@/types/policies';
import { policyGroups, policyLabels, policyTitles } from '@/components/policies/labels';

export function Footer({ lang, settings }: { lang: Language; settings?: JournalSettings }) {
 const t = policyLabels[lang];
 const dict = getDictionary(lang);
 const unverifiedIssn = lang === 'en' ? 'not verified' : lang === 'ru' ? 'не подтверждён' : 'tekshirilmoqda';
 return <footer className="journal-footer bg-navy-950 text-slate-300 border-t border-navy-800">
  <div className="journal-container"><div className="journal-footer-top"><Link href={`/${lang}/policies`}><BookOpen size={18} />{t.hub} →</Link><div><Link href={`/${lang}/indexing`}>{lang === 'en' ? 'Indexing status' : lang === 'ru' ? 'Статус индексации' : 'Indekslash holati'}</Link><Link href={`/${lang}/ethics`}>{dict.nav.ethics}</Link><Link href={`/${lang}/open-access`}>{dict.nav.openAccess}</Link></div></div>
  <div className="journal-footer-grid"><div className="journal-footer-brand"><Link href={`/${lang}`} className="text-xl font-bold text-white">{settings?.journal_name || 'AGM Journal'}</Link><p>{dict.footer.aboutText}</p>{settings?.publisher && <p>{settings.publisher}</p>}<dl>{<div><dt>ISSN Online</dt><dd>{isValidIssn(settings?.issn_online) ? settings?.issn_online : unverifiedIssn}</dd></div>}{<div><dt>ISSN Print</dt><dd>{isValidIssn(settings?.issn_print) ? settings?.issn_print : unverifiedIssn}</dd></div>}{settings?.doi_prefix && settings.doi_prefix !== '10.5281/zenodo.agm' && <div><dt>DOI</dt><dd>{settings.doi_prefix}</dd></div>}</dl><a href={`mailto:${settings?.contact_email || 'editorial@agmjoural.uz'}`}>{settings?.contact_email || 'editorial@agmjoural.uz'}</a>{settings?.contact_phone && <a href={`tel:${settings.contact_phone}`}>{settings.contact_phone}</a>}{settings?.address && <p>{settings.address}</p>}<div className="journal-footer-quick"><Link href={`/${lang}/articles`}>{dict.nav.articles}</Link><Link href={`/${lang}/archive`}>{dict.nav.archive}</Link><Link href={`/${lang}/editorial-board`}>{dict.nav.editorial}</Link><Link href={`/${lang}/submit`}>{t.submit}</Link><Link href="/verify-certificate">{dict.nav.verifyCertificate}</Link></div></div>
   {policyGroups.map((group, index) => <nav key={index} aria-label={t.groups[index]}><h2>{t.groups[index]}</h2><ul>{group.map(id => <li key={id}><Link href={`/${lang}/${id}`}>{policyTitles[lang][policyIds.indexOf(id)]}</Link></li>)}</ul></nav>)}
  </div><div className="journal-footer-bottom"><p>© {new Date().getFullYear()} {settings?.journal_name || 'AGM Journal'}. {dict.footer.allRightsReserved}</p><Link href={`/api/policies/handbook/pdf?lang=${lang}`}>{t.handbook} ↓</Link><Link href={`/${lang}/contact`}>{dict.nav.contact}</Link></div></div>
 </footer>;
}
