import { manuscriptFieldNames } from './manuscript-fields';

/** Extract suggestions from Uzbek, English and Russian headings; authors review them. */
export function extractManuscriptMetadata(text: string) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').map(line => line.trim()).filter(Boolean);
  const abstractHeading = /^(?:\d+[.)]?\s+)?(?:abstract|summary|annotatsiya|аннотация)(?:\s*[:.\-\u2013\u2014]\s*|\s*$)/i;
  const keywordsHeading = /^(?:key\s*words|index terms|kalit so[‘’ʻʼ'`]?zlar|ключевые слова)(?:\s*[:.\-\u2013\u2014]\s*|\s*$)/i;
  const bodyHeading = /^(?:\d+(?:\.\d+)*[.)]?\s+)?(?:introduction|background|materials? and methods|methods|methodology|results|discussion|conclusions?|references|bibliography|kirish|metodlar|natijalar|muhokama|xulosa|adabiyotlar|введение|методы|результаты|обсуждение|заключение|литература)(?:\s*$|\s*[:.\-\u2013\u2014])/i;
  const abstractAt = lines.findIndex(line => abstractHeading.test(line));
  const keywordsAt = lines.findIndex(line => keywordsHeading.test(line));
  const bodyAt = lines.findIndex(line => bodyHeading.test(line));
  const frontEnd = Math.min(...[abstractAt, bodyAt, 40].filter(index => index >= 0));
  const front = lines.slice(0, frontEnd);
  const labeled = (pattern: RegExp) => {
    const at = front.findIndex(line => pattern.test(line));
    if (at < 0) return undefined;
    const inline = front[at].replace(pattern, '').trim();
    // A label on its own may be followed by its value in the next paragraph.
    const value = inline || front[at + 1];
    return value && !/^(?:title|author|corresponding author|affiliation|country|e-?mail|sarlavha|muallif|mas[‘’ʻʼ'`]?ul muallif|tashkilot|mamlakat|название|автор|контактный автор|организация|страна)\s*:/i.test(value) ? value : undefined;
  };
  const title = labeled(/^(?:(?:article\s+)?title|sarlavha|maqola nomi|название(?: статьи)?)\s*:\s*/i) || front.find(line =>
    line.length >= 5 && !/^(?:author|corresponding author|affiliation|country|e-?mail|doi|orcid|muallif|mas[‘’ʻʼ'`]?ul muallif|tashkilot|mamlakat|автор|контактный автор|организация|страна)\s*:/i.test(line));
  const abstract: string[] = [];
  if (abstractAt >= 0) {
    const inline = lines[abstractAt].replace(abstractHeading, '');
    if (inline) abstract.push(inline);
    for (let at = abstractAt + 1; at < lines.length; at++) {
      const line = lines[at];
      // Structured abstracts may contain Background:, Methods: and Results:.
      // A following Keywords heading gives an unambiguous end for those sections.
      const structured = keywordsAt > at && !/^(?:\d+[.)]?\s+)?(?:introduction|kirish|введение)(?:\s|:|$)/i.test(line);
      if (keywordsHeading.test(line) || (bodyHeading.test(line) && !structured)) break;
      abstract.push(line);
    }
  }
  const keywordLines: string[] = [];
  if (keywordsAt >= 0) {
    const inline = lines[keywordsAt].replace(keywordsHeading, '');
    if (inline) keywordLines.push(inline);
    for (const line of lines.slice(keywordsAt + 1, keywordsAt + 5)) {
      if (bodyHeading.test(line) || abstractHeading.test(line) || (!/[,;]/.test(line) && keywordLines.length)) break;
      keywordLines.push(line);
    }
  }
  const referencesAt = lines.findIndex(line => /^(?:\d+[.)]?\s+)?(?:references|bibliography|adabiyotlar|foydalanilgan adabiyotlar|литература|список литературы)\s*[:.]?$/i.test(line));
  const explicitEmail = labeled(/^e-?mail\s*:\s*/i);
  return {
    title: title?.slice(0, 500),
    abstract: abstract.join('\n\n').slice(0, 10000) || undefined,
    keywords: keywordLines.join(', ').split(/[,;]/).map(word => word.trim()).filter(word => word.length > 1).join(', ').slice(0, 1000) || undefined,
    author_name: labeled(/^(?:corresponding\s+author|author(?:\s+name)?|muallif|mas[‘’ʻʼ'`]?ul muallif|автор|контактный автор)\s*:\s*/i)?.slice(0, 150),
    email: (explicitEmail || front.join(' ')).match(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.slice(0, 254),
    affiliation: labeled(/^(?:affiliation|tashkilot|организация)\s*:\s*/i)?.slice(0, 500),
    country: labeled(/^(?:country|mamlakat|страна)\s*:\s*/i)?.slice(0, 100),
    references: referencesAt >= 0 ? lines.slice(referencesAt + 1) : undefined,
  };
}

export type ManuscriptMetadata = ReturnType<typeof extractManuscriptMetadata>;

export function metadataReport(metadata: ManuscriptMetadata) {
  return {
    found: manuscriptFieldNames.filter(field => Boolean(metadata[field])),
    missing: manuscriptFieldNames.filter(field => !metadata[field]),
  };
}
