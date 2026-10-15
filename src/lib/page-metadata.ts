import type { Metadata } from 'next';
import type { Language } from '@/types/journal';
import { siteUrl } from './site-url';
import { getJournalSettings } from './db';
import { getPolicyDocument } from './policies';
import type { PolicyId } from '@/types/policies';

export async function policyMetadata(id: PolicyId, lang: string) {
  const language = (['en', 'uz', 'ru'].includes(lang) ? lang : 'en') as Language;
  const doc = getPolicyDocument(id, language, await getJournalSettings());
  return publicPageMetadata(language, `/${id}`, doc.title, doc.summary);
}

export function publicPageMetadata(lang: Language, path: string, title: string, description: string): Metadata {
  const url = siteUrl(`/${lang}${path}`);
  return {
    title: `${title} | AGM Journal`, description,
    alternates: { canonical: url, languages: Object.fromEntries([...(['en', 'uz', 'ru'] as const).map(code => [code, siteUrl(`/${code}${path}`)]), ['x-default', siteUrl(`/en${path}`)]]) },
    openGraph: { title, description, url, siteName: 'AGM Journal', type: 'website', locale: lang === 'en' ? 'en_US' : lang === 'ru' ? 'ru_RU' : 'uz_UZ' },
    twitter: { card: 'summary', title, description },
  };
}
