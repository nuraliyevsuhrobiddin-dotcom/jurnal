import { publicPageMetadata } from '@/lib/page-metadata';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Download, ArrowUpRight } from 'lucide-react';
import { getJournalSettings } from '@/lib/db';
import { getPolicyDocument } from '@/lib/policies';
import type { Language } from '@/types/journal';
import { POLICY_DATE, POLICY_VERSION } from '@/types/policies';
import { policyGroups, policyLabels } from '@/components/policies/labels';

export default async function PolicyHub({ params }: { params: Promise<{ lang: string }> }) {
 const { lang } = await params;
 if (!['uz', 'en', 'ru'].includes(lang)) notFound();
 const language = lang as Language;
 const t = policyLabels[language];
 const settings = await getJournalSettings();
 return <div className="policy-page"><div className="policy-banner"><div className="policy-width"><p className="policy-kicker">AGM / {t.edition}</p><h1>{t.hub}</h1><p>{t.intro}</p><div className="policy-hub-meta">{t.version} {POLICY_VERSION} · {POLICY_DATE}</div><a className="policy-button" href={`/api/policies/handbook/pdf?lang=${lang}`}><Download size={16} />{t.handbook}</a></div></div><div className="policy-width policy-hub">{policyGroups.map((ids, index) => <section key={index} className="policy-hub-group"><div className="policy-hub-group-heading"><span>{String(index + 1).padStart(2, '0')}</span><h2>{t.groups[index]}</h2></div><div>{ids.map(id => { const doc = getPolicyDocument(id, language, settings); return <Link key={id} href={`/${lang}/${id}`} className="policy-hub-link"><div><h3>{doc.title}</h3><p>{doc.summary}</p></div><ArrowUpRight size={19} aria-hidden="true" /></Link>; })}</div></section>)}<div className="policy-hub-contact"><strong>{t.contact}</strong><a href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a><Link href={`/${lang}/submit`}>{t.submit} →</Link></div></div></div>;
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
 const { lang } = await params;
 return publicPageMetadata((['en', 'uz', 'ru'].includes(lang) ? lang : 'en') as Language, "/policies", "Editorial policies", "Read the publication ethics, peer review, open access and author policies of AGM Journal.");
}
