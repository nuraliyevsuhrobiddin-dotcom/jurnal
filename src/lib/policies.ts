import { createHash } from 'node:crypto';
import { policyContent } from './policy-content';
import { policyIds, POLICY_DATE, POLICY_VERSION, type PolicyDocument, type PolicyId } from '@/types/policies';
import type { JournalSettings, Language } from '@/types/journal';

export function isPolicyId(value: string): value is PolicyId {
  return policyIds.some(id => id === value);
}

export function isJournalLanguage(value: string): value is Language {
  return value === 'uz' || value === 'en' || value === 'ru';
}

export function getPolicyDocument(id: PolicyId, lang: Language, settings: JournalSettings): PolicyDocument {
  const unpublished = lang === 'uz' ? 'Tahririyatdan aniqlashtiring' : lang === 'ru' ? 'Уточните в редакции' : 'Confirm with the editorial office';
  const replacements: Record<string, string> = {
    journal: settings.journal_name,
    publisher: settings.publisher,
    email: settings.contact_email,
    phone: settings.contact_phone || unpublished,
    address: settings.address || unpublished,
    year: String(settings.established_year),
  };
  const expand = (text: string) => text.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => replacements[key] ?? unpublished);
  const document = policyContent[lang][id];
  return {
    ...document,
    title: expand(document.title), summary: expand(document.summary),
    sections: document.sections.map(section => ({ ...section, title: expand(section.title), paragraphs: section.paragraphs.map(expand), items: section.items?.map(expand) })),
  };
}

export function getPolicyDocuments(lang: Language, settings: JournalSettings): PolicyDocument[] {
  return policyIds.map(id => getPolicyDocument(id, lang, settings));
}

export function getPolicyHash(document: PolicyDocument, lang: Language): string {
  return createHash('sha256').update(JSON.stringify({ version: POLICY_VERSION, date: POLICY_DATE, lang, document }), 'utf8').digest('hex');
}

export function getHandbookHash(documents: PolicyDocument[], lang: Language): string {
  return createHash('sha256').update(JSON.stringify({ version: POLICY_VERSION, date: POLICY_DATE, lang, documents }), 'utf8').digest('hex');
}
