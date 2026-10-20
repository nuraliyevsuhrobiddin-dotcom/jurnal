import { randomUUID } from 'node:crypto';
import type { Article, JournalSettings } from '@/types/journal';
import { articleUrl, xml } from './scholarly-feeds';
import { isValidDoi, isValidIssn, normalizeDoi } from './identifiers';
import { internationalMetadataGaps } from './international-metadata';
import { scholarlyAuthorName } from './seo';

export class CrossrefExportError extends Error {}

export function crossrefGaps(article: Article, settings: JournalSettings) {
  const gaps = internationalMetadataGaps(article);
  if (article.status !== 'published') gaps.push('Nashr qilingan maqola');
  const prefix = settings.doi_prefix?.trim();
  if (!prefix || !/^10\.\d{4,9}$/.test(prefix)) gaps.push('Nashriyot DOI prefiksi');
  if (!article.doi || !isValidDoi(article.doi) || (prefix && normalizeDoi(article.doi).split('/')[0] !== prefix)) gaps.push('Nashriyot prefiksiga mos DOI');
  if (!isValidIssn(settings.issn_online) && !isValidIssn(settings.issn_print)) gaps.push('To‘g‘ri formatdagi ISSN');
  if (!settings.publisher?.trim() || !settings.journal_name?.trim()) gaps.push('Nashriyot va jurnal nomi');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.contact_email || '')) gaps.push('Jurnal aloqa emaili');
  if (!article.authors?.length || article.authors.some(author => !scholarlyAuthorName(author.full_name))) gaps.push('Muallif ismi');
  const date = article.publication_date || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) gaps.push('Nashr sanasi');
  return gaps;
}

/** Download only: never submits to Crossref and never allocates a DOI. */
export function crossrefXml(article: Article, settings: JournalSettings) {
  const gaps = crossrefGaps(article, settings);
  if (gaps.length) throw new CrossrefExportError(`Crossref eksporti uchun to‘ldiring: ${gaps.join(', ')}.`);
  const [year, month, day] = article.publication_date!.split('-');
  const date = `<publication_date media_type="online"><month>${Number(month)}</month><day>${Number(day)}</day><year>${year}</year></publication_date>`;
  const issns = ([['electronic', settings.issn_online], ['print', settings.issn_print]] as const)
    .filter(([, value]) => isValidIssn(value)).map(([type, value]) => {
      const digits = value!.trim().toUpperCase().replace('-', '');
      return `<issn media_type="${type}">${digits.slice(0, 4)}-${digits.slice(4)}</issn>`;
    }).join('');
  // Only a full-name field is stored. Keep it intact; editors must check name parts before depositing.
  const contributors = [...article.authors!].sort((a, b) => a.order_index - b.order_index)
    .map((author, index) => `<person_name sequence="${index ? 'additional' : 'first'}" contributor_role="author"><surname>${xml(scholarlyAuthorName(author.full_name))}</surname></person_name>`).join('');
  const issue = article.issue ? `<journal_issue>${date}<journal_volume><volume>${article.issue.volume}</volume></journal_volume><issue>${article.issue.issue_number}</issue></journal_issue>` : '';
  const pages = article.page_first ? `<pages><first_page>${article.page_first}</first_page>${article.page_last ? `<last_page>${article.page_last}</last_page>` : ''}</pages>` : '';
  const references = article.references_list.filter(reference => reference.trim());
  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<doi_batch xmlns="http://www.crossref.org/schema/5.3.1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:jats="http://www.ncbi.nlm.nih.gov/JATS1" version="5.3.1" xsi:schemaLocation="http://www.crossref.org/schema/5.3.1 https://www.crossref.org/schemas/crossref5.3.1.xsd">` +
    `<head><doi_batch_id>agm-${randomUUID()}</doi_batch_id><timestamp>${Date.now()}</timestamp><depositor><depositor_name>${xml(settings.publisher)}</depositor_name><email_address>${xml(settings.contact_email)}</email_address></depositor><registrant>${xml(settings.publisher)}</registrant></head>` +
    `<body><journal><journal_metadata><full_title>${xml(settings.journal_name)}</full_title>${issns}</journal_metadata>${issue}` +
    `<journal_article publication_type="full_text" language="${xml(article.original_language)}"><titles><title>${xml(article.title_en!.trim())}</title></titles>` +
    `<contributors>${contributors}</contributors><jats:abstract xml:lang="en"><jats:p>${xml(article.abstract_en!.trim())}</jats:p></jats:abstract>${date}${pages}` +
    `<doi_data><doi>${xml(normalizeDoi(article.doi!))}</doi><resource>${xml(articleUrl(article))}</resource></doi_data>` +
    (references.length ? `<citation_list>${references.map((reference, index) => `<citation key="ref-${index + 1}"><unstructured_citation>${xml(reference)}</unstructured_citation></citation>`).join('')}</citation_list>` : '') +
    '</journal_article></journal></body></doi_batch>';
}
