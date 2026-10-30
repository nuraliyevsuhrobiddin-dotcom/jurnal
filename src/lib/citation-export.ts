import type { Article, Language } from '@/types/journal';
import { siteUrl } from './site-url';
import { scholarlyAuthorName } from './seo';

const plain = (text: string) => text.replace(/[\r\n\t]+/g, ' ').trim();
const bib = (text: string) => plain(text).replace(/\\/g, '\\textbackslash{}').replace(/[{}%&#_$]/g, value => `\\${value}`);
export function exportCitation(article: Article, journal: string, lang: Language, format: 'ris' | 'bib') {
  const title = (lang === 'en' ? article.title_en : lang === 'ru' ? article.title_ru : article.title_uz) || article.title_uz;
  const url = siteUrl(`/${lang}/article/${article.slug}`);
  const authors = (article.authors || []).map(author => scholarlyAuthorName(author.full_name));
  const year = article.publication_date?.slice(0, 4) || String(article.issue?.year || '');
  const note = article.status === 'withdrawn' ? `Withdrawn: ${article.retraction_reason || 'See publication record'}` : '';
  if (format === 'ris') {
    return ['TY  - JOUR', `TI  - ${plain(title)}`, ...authors.map(name => `AU  - ${plain(name)}`), `JO  - ${plain(journal)}`,
      ...(year ? [`PY  - ${year}`] : []), ...(article.issue ? [`VL  - ${article.issue.volume}`, `IS  - ${article.issue.issue_number}`] : []),
      ...(article.page_first ? [`SP  - ${article.page_first}`] : []), ...(article.page_last ? [`EP  - ${article.page_last}`] : []),
      ...(article.doi ? [`DO  - ${plain(article.doi)}`] : []), ...(note ? [`N1  - ${plain(note)}`] : []), `UR  - ${url}`, 'ER  -', ''].join('\r\n');
  }
  const fields: Record<string, string> = { title, author: authors.join(' and '), journal, year, url };
  if (note) fields.note = note;
  if (article.issue) { fields.volume = String(article.issue.volume); fields.number = String(article.issue.issue_number); }
  if (article.doi) fields.doi = article.doi;
  if (article.page_first) fields.pages = `${article.page_first}${article.page_last ? '--' + article.page_last : ''}`;
  return `@article{agm${article.id.replace(/[^a-zA-Z0-9]/g, '')},\n${Object.entries(fields).filter(([, value]) => value).map(([key, value]) => `  ${key} = {${bib(value)}}`).join(',\n')}\n}\n`;
}
