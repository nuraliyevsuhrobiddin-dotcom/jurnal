import type { Language } from './journal';

export const policyIds = ['journal-charter', 'about', 'guidelines', 'peer-review', 'ethics', 'plagiarism', 'open-access', 'apc', 'indexing', 'complaints', 'corrections', 'data-policy', 'ai-policy', 'archiving', 'privacy', 'terms'] as const;
export type PolicyId = (typeof policyIds)[number];
export const POLICY_VERSION = '1.1.0';
export const POLICY_DATE = '2026-10-24';

export interface PolicySource { label: string; url: string }
export interface PolicySection { id: string; title: string; paragraphs: string[]; items?: string[] }
export interface PolicyDocument {
  id: PolicyId;
  title: string;
  summary: string;
  sections: PolicySection[];
  sources: PolicySource[];
}
export type PolicyContent = Record<Language, Record<PolicyId, PolicyDocument>>;

export const policySources = {
  scopus: { label: 'Elsevier — Scopus content policy and selection', url: 'https://www.elsevier.com/products/scopus/content/content-policy-and-selection' },
  transparency: { label: 'DOAJ / COPE / OASPA / WAME — Transparency and best practice', url: 'https://doaj.org/apply/transparency/' },
  cope: { label: 'COPE — Core practices', url: 'https://publicationethics.org/core-practices' },
  authorship: { label: 'ICMJE — Authorship and contributorship', url: 'https://www.icmje.org/recommendations/browse/roles-and-responsibilities/defining-the-role-of-authors-and-contributors.html' },
  license: { label: 'Creative Commons — CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
  ai: { label: 'Elsevier — Generative AI policies for journals', url: 'https://www.elsevier.com/about/policies-and-standards/generative-ai-policies-for-journals' },
} satisfies Record<string, PolicySource>;
