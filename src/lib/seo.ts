import { Article, JournalSettings, Language } from '@/types/journal';
import { Metadata } from 'next';
import { isValidIssn } from '@/lib/identifiers';
import { SITE_URL } from './site-url';
import { resolveSubjectId, subjectLabel } from './subjects';

const BASE_URL = SITE_URL;

export function scholarlyAuthorName(name: string) {
  return name.replace(/^(?:(?:prof(?:essor)?|dr|dsc|phd|academician|проф(?:ессор)?|д-р|академик)\.?\s+)+/iu, '').trim();
}

export function getArticleMetadata(
  article: Article,
  lang: Language,
  settings: JournalSettings
): Metadata {
  const title = lang === 'en' && article.title_en
    ? article.title_en
    : lang === 'ru' && article.title_ru
      ? article.title_ru
      : article.title_uz;

  const abstract = lang === 'en' && article.abstract_en
    ? article.abstract_en
    : lang === 'ru' && article.abstract_ru
      ? article.abstract_ru
      : article.abstract_uz;

  const authors = article.authors || [];
  const authorNames = authors.map(a => scholarlyAuthorName(a.full_name));
  const keywords = lang === 'en' && article.keywords_en && article.keywords_en.length > 0
    ? article.keywords_en
    : lang === 'ru' && article.keywords_ru && article.keywords_ru.length > 0
      ? article.keywords_ru
      : article.keywords_uz;

  const canonicalUrl = `${BASE_URL}/${lang}/article/${article.slug}`;

  // Build Google Scholar Citation Meta Tags
  const otherMeta: Record<string, string | string[]> = {
    'citation_title': title,
    'citation_journal_title': settings.journal_name,
    'citation_publisher': settings.publisher,
    'citation_publication_date': article.publication_date || article.created_at.split('T')[0],
  };

  if (article.issue) {
    otherMeta['citation_volume'] = String(article.issue.volume);
    otherMeta['citation_issue'] = String(article.issue.issue_number);
  }

  if (article.page_first) {
    otherMeta['citation_firstpage'] = String(article.page_first);
  }
  if (article.page_last) {
    otherMeta['citation_lastpage'] = String(article.page_last);
  }

  if (article.doi) {
    otherMeta['citation_doi'] = article.doi;
  }

  if (settings.issn_online && isValidIssn(settings.issn_online)) {
    otherMeta['citation_issn'] = settings.issn_online;
  }

  const pdfUrl = `${canonicalUrl}/fulltext.pdf`;
  otherMeta['citation_pdf_url'] = pdfUrl;
  otherMeta['citation_language'] = article.original_language;
  otherMeta['citation_abstract_html_url'] = canonicalUrl;
  otherMeta['citation_author_institution'] = authors.map(author => author.affiliation);

  // Multiple citation_author tags
  if (authorNames.length > 0) {
    otherMeta['citation_author'] = authorNames;
  }

  return {
    title: `${title} | ${settings.journal_name}`,
    description: abstract.slice(0, 160) + '...',
    keywords: keywords.join(', '),
    authors: authorNames.map(name => ({ name })),
    alternates: {
      types: { 'application/rss+xml': `${BASE_URL}/feed.xml?lang=${lang}` },
      canonical: canonicalUrl,
      languages: {
        'uz': `${BASE_URL}/uz/article/${article.slug}`,
        'en': `${BASE_URL}/en/article/${article.slug}`,
        'ru': `${BASE_URL}/ru/article/${article.slug}`,
        'x-default': `${BASE_URL}/en/article/${article.slug}`,
      },
    },
    openGraph: {
      title,
      description: abstract.slice(0, 200),
      url: canonicalUrl,
      siteName: settings.journal_name,
      type: 'article',
      publishedTime: article.publication_date || article.created_at,
      authors: authorNames,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: abstract.slice(0, 200),
    },
    other: otherMeta,
  };
}

export function generateArticleJsonLd(article: Article, settings: JournalSettings, lang: Language = 'en') {
  const url = `${BASE_URL}/${lang}/article/${article.slug}`;
  const title = (lang === 'ru' ? article.title_ru : lang === 'en' ? article.title_en : article.title_uz) || article.title_uz;
  const abstract = (lang === 'ru' ? article.abstract_ru : lang === 'en' ? article.abstract_en : article.abstract_uz) || article.abstract_uz;
  return {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    '@id': `${url}#article`,
    'url': url,
    'mainEntityOfPage': url,
    'headline': title,
    'name': title,
    'description': abstract,
    'articleSection': subjectLabel(resolveSubjectId(article), lang),
    'dateModified': article.updated_at,
    'isAccessibleForFree': true,
    ...(article.license === 'CC BY 4.0' ? { license: 'https://creativecommons.org/licenses/by/4.0/' } : {}),
    'encoding': { '@type': 'MediaObject', contentUrl: `${url}/fulltext.pdf`, encodingFormat: 'application/pdf' },
    'datePublished': article.publication_date || article.created_at,
    'inLanguage': article.original_language,
    'author': (article.authors || []).map(a => ({
      '@type': 'Person',
      'name': scholarlyAuthorName(a.full_name),
      'affiliation': {
        '@type': 'Organization',
        'name': a.affiliation,
      },
      ...(a.orcid ? { '@id': `https://orcid.org/${a.orcid}` } : {}),
    })),
    'isPartOf': {
      '@type': 'Periodical',
      'name': settings.journal_name,
      ...(isValidIssn(settings.issn_online) ? { issn: settings.issn_online } : {}),
      'publisher': {
        '@type': 'Organization',
        'name': settings.publisher,
      },
    },
    ...(article.doi ? { 'identifier': `https://doi.org/${article.doi}` } : {}),
    ...(article.page_first ? { 'pageStart': article.page_first } : {}),
    ...(article.page_last ? { 'pageEnd': article.page_last } : {}),
  };
}
