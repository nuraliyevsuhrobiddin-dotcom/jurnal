import type { Article, JournalSettings, Language } from '@/types/journal';
import { siteUrl } from './site-url';
import { normalizeDoi, isValidDoi } from './identifiers';

export function xml(value: string | number): string {
  return String(value).replace(/[^\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]/gu, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export function articleText(article: Article, lang: Language) {
  return {
    title: (lang === 'en' ? article.title_en : lang === 'ru' ? article.title_ru : article.title_uz)?.trim() || article.title_uz,
    abstract: (lang === 'en' ? article.abstract_en : lang === 'ru' ? article.abstract_ru : article.abstract_uz)?.trim() || article.abstract_uz,
    keywords: (lang === 'en' ? article.keywords_en : lang === 'ru' ? article.keywords_ru : article.keywords_uz) || article.keywords_uz,
  };
}

export function articleUrl(article: Article, lang: Language = article.original_language) {
  return siteUrl(`/${lang}/article/${encodeURIComponent(article.slug)}`);
}

/** Public fields only. Never spread the stored article or author object into a public response. */
export function publicArticleMetadata(article: Article, settings: JournalSettings, lang: Language) {
  const text = articleText(article, lang);
  return {
    id: article.id, ...text, language: article.original_language, type: article.article_type,
    url: articleUrl(article, lang),
    pdf_url: article.status === 'published' && article.pdf_url ? `${articleUrl(article, lang)}/fulltext.pdf` : null,
    status: article.status, revision: article.revision || 1,
    ...(article.status === 'withdrawn' ? { withdrawal_reason: article.retraction_reason || null } : {}),
    doi: article.doi && isValidDoi(article.doi) ? normalizeDoi(article.doi) : null,
    published: article.publication_date || null, updated: article.updated_at, license: article.license,
    journal: settings.journal_name, publisher: settings.publisher,
    issue: article.issue ? { volume: article.issue.volume, number: article.issue.issue_number, year: article.issue.year } : null,
    pages: { first: article.page_first || null, last: article.page_last || null },
    authors: (article.authors || []).map(author => ({ name: author.full_name, affiliation: author.affiliation, country: author.country, orcid: author.orcid || null })),
    references: article.references_list,
  };
}

export function rssFeed(articles: Article[], settings: JournalSettings, lang: Language) {
  const self = siteUrl(`/feed.xml?lang=${lang}`);
  const items = articles.filter(article => article.status === 'published').slice(0, 50).map(article => {
    const text = articleText(article, lang);
    const date = article.publication_date && new Date(article.publication_date);
    return `<item><title>${xml(text.title)}</title><link>${xml(articleUrl(article, lang))}</link>` +
      `<guid isPermaLink="false">${xml(siteUrl(`/api/articles/${encodeURIComponent(article.id)}/metadata`))}</guid>` +
      `<description>${xml(text.abstract)}</description>` +
      (date && !Number.isNaN(date.getTime()) ? `<pubDate>${date.toUTCString()}</pubDate>` : '') +
      text.keywords.map(word => `<category>${xml(word)}</category>`).join('') + '</item>';
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>` +
    `<title>${xml(settings.journal_name)}</title><link>${xml(siteUrl(`/${lang}`))}</link>` +
    `<description>${xml(settings.tagline || settings.journal_name)}</description><language>${lang}</language>` +
    `<atom:link href="${xml(self)}" rel="self" type="application/rss+xml"/>${items}</channel></rss>`;
}

export function dublinCore(article: Article, settings: JournalSettings) {
  const titles = [...new Set([article.title_uz, article.title_en, article.title_ru].filter((value): value is string => Boolean(value?.trim())))];
  const descriptions = [...new Set([article.abstract_uz, article.abstract_en, article.abstract_ru].filter((value): value is string => Boolean(value?.trim())))];
  const words = [...new Set([...(article.keywords_uz || []), ...(article.keywords_en || []), ...(article.keywords_ru || [])])];
  return `<oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/ http://www.openarchives.org/OAI/2.0/oai_dc.xsd">` +
    titles.map(value => `<dc:title>${xml(value)}</dc:title>`).join('') +
    (article.authors || []).map(author => `<dc:creator>${xml(author.full_name)}</dc:creator>`).join('') +
    words.map(value => `<dc:subject>${xml(value)}</dc:subject>`).join('') +
    descriptions.map(value => `<dc:description>${xml(value)}</dc:description>`).join('') +
    `<dc:publisher>${xml(settings.publisher)}</dc:publisher>` +
    (article.publication_date ? `<dc:date>${xml(article.publication_date)}</dc:date>` : '') +
    `<dc:type>Text</dc:type><dc:identifier>${xml(articleUrl(article))}</dc:identifier>` +
    (article.doi && isValidDoi(article.doi) ? `<dc:identifier>${xml(`https://doi.org/${normalizeDoi(article.doi)}`)}</dc:identifier>` : '') +
    `<dc:source>${xml(settings.journal_name)}</dc:source><dc:language>${xml(article.original_language)}</dc:language>` +
    `<dc:rights>${xml(article.license)}</dc:rights></oai_dc:dc>`;
}
