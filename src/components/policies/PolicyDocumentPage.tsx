import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getJournalSettings } from '@/lib/db';
import { getPolicyDocument, getPolicyHash } from '@/lib/policies';
import type { Language } from '@/types/journal';
import { POLICY_DATE, POLICY_VERSION, type PolicyId } from '@/types/policies';
import { PolicyActions } from './PolicyActions';
import { PolicySeal } from './PolicySeal';
import { policyLabels } from './labels';

export async function PolicyDocumentPage({ id, params }: { id: PolicyId; params: Promise<{ lang: string }> }) {
 const { lang } = await params;
 if (!['uz', 'en', 'ru'].includes(lang)) notFound();
 const language = lang as Language;
 const settings = await getJournalSettings();
 const doc = getPolicyDocument(id, language, settings);
 const t = policyLabels[language];
 const verifyUrl = `/${lang}/policies/verify?id=${id}&version=${POLICY_VERSION}&hash=${getPolicyHash(doc, language)}`;
 return <div className="policy-page">
  <div className="policy-banner"><div className="policy-width"><Link href={`/${lang}/policies`} className="policy-breadcrumb">{t.hub} <span> / {String(id).toUpperCase()}</span></Link><h1>{doc.title}</h1><p>{doc.summary}</p></div></div>
  <div className="policy-width policy-layout">
   <aside className="policy-toc"><nav aria-label={t.contents}><h2>{t.contents}</h2><ol>{doc.sections.map((section, index) => <li key={section.id}><a href={`#${section.id}`}><span>{String(index + 1).padStart(2, '0')}</span>{section.title}</a></li>)}</ol><a className="policy-toc-all" href={`/${lang}/policies`}>{t.all} →</a></nav></aside>
   <article className="policy-document"><div className="policy-document-head"><div><p className="policy-kicker">{settings.journal_name}</p><h2>{doc.title}</h2></div><PolicySeal lang={language} /></div>
    <dl className="policy-metadata"><div><dt>{t.version}</dt><dd>{POLICY_VERSION}</dd></div><div><dt>{t.date}</dt><dd><time dateTime={POLICY_DATE}>{new Intl.DateTimeFormat(lang === 'uz' ? 'uz-UZ' : lang === 'ru' ? 'ru-RU' : 'en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(POLICY_DATE))}</time></dd></div><div><dt>{t.publisher}</dt><dd>{settings.publisher}</dd></div></dl>
    <PolicyActions id={id} lang={language} />
    <div className="policy-sections">{doc.sections.map((section, index) => <section key={section.id} id={section.id}><h2><span>{String(index + 1).padStart(2, '0')}</span>{section.title}</h2>{section.paragraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>)}{section.items?.length ? <ul>{section.items.map((item, i) => <li key={i}>{item}</li>)}</ul> : null}</section>)}</div>
    {doc.sources.length > 0 && <section className="policy-sources"><h2>{t.sources}</h2><ul>{doc.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label} ↗</a><span className="policy-source-url">{source.url}</span></li>)}</ul></section>}
    <div className="policy-document-end"><div><strong>{t.contact}</strong><a href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a>{settings.contact_phone && <a href={`tel:${settings.contact_phone}`}>{settings.contact_phone}</a>}</div><Link href={verifyUrl} className="policy-verify">{t.verify} ↗</Link></div>
   </article>
  </div>
 </div>;
}
