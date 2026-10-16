import type { Article, Language } from '@/types/journal';
export const subjectCollections = [
  { id: 'natural-sciences', labels: { uz: 'Tabiiy fanlar', en: 'Natural sciences', ru: 'Естественные науки' }, terms: ['physics', 'chemistry', 'mathemat', 'environment', 'ecolog', 'fizika', 'kimyo', 'matematik', 'ekolog', 'физик', 'хими', 'математ', 'эколог'] },
  { id: 'engineering-technology', labels: { uz: 'Muhandislik va texnologiya', en: 'Engineering & technology', ru: 'Инженерия и технологии' }, terms: ['energy', 'energet', 'energiya', 'энерг', 'engineer', 'technolog', 'comput', 'artificial intelligence', 'software', 'muhandis', 'texnolog', 'sunʼiy', 'sun’iy', "sun'iy", 'dastur', 'инженер', 'технолог', 'компьют', 'искусственн'] },
  { id: 'medicine-life-sciences', labels: { uz: 'Tibbiyot va hayot fanlari', en: 'Medicine & life sciences', ru: 'Медицина и биология' }, terms: ['biotech', 'biotex', 'биотех', 'medic', 'health', 'biolog', 'clinical', 'tibb', 'sog‘liq', 'salomat', 'biolog', 'медицин', 'здоров', 'биолог', 'клинич'] },
  { id: 'economics-business', labels: { uz: 'Iqtisodiyot va biznes', en: 'Economics & business', ru: 'Экономика и бизнес' }, terms: ['econom', 'business', 'financ', 'management', 'iqtisod', 'biznes', 'moliya', 'boshqaruv', 'эконом', 'бизнес', 'финанс', 'управлен'] },
  { id: 'social-sciences', labels: { uz: 'Ijtimoiy fanlar', en: 'Social sciences', ru: 'Социальные науки' }, terms: ['social', 'societ', 'sociolog', 'law', 'politic', 'ijtimoiy', 'jamiyat', 'huquq', 'siyos', 'социаль', 'обществ', 'социолог', 'право', 'полит'] },
  { id: 'education-humanities', labels: { uz: 'Ta’lim va gumanitar fanlar', en: 'Education & humanities', ru: 'Образование и гуманитарные науки' }, terms: ['educat', 'pedagog', 'linguist', 'histor', 'cultur', 'literat', 'ta’lim', "ta'lim", 'talim', 'tilshunos', 'tarix', 'madaniyat', 'adabiyot', 'образован', 'педагог', 'лингвист', 'истор', 'культур', 'литератур'] },
  { id: 'multidisciplinary', labels: { uz: 'Ko‘p tarmoqli tadqiqotlar', en: 'Multidisciplinary research', ru: 'Междисциплинарные исследования' }, terms: [] },
] as const;
export function findSubject(id?: string) { return subjectCollections.find(subject => subject.id === id); }
export function matchesSubject(article: Article, subject: NonNullable<ReturnType<typeof findSubject>>) {
  return resolveSubjectId(article) === subject.id;
}
export function subjectLabel(id: string, lang: Language) { return findSubject(id)?.labels[lang]; }

const normalize = (value: string) => value.toLowerCase().normalize('NFKC').replace(/[\u2018\u2019\u02bc\u02bb`']/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
function termMatches(text: string, term: string) {
  const value = normalize(term);
  if (value.includes(' ')) return (` ${text} `).includes(` ${value} `);
  return text.split(' ').some(word => value.length < 4 ? word === value : word.startsWith(value));
}

/** One primary collection; ties and insufficient evidence stay multidisciplinary. */
export function classifyArticle(article: Pick<Article, 'title_uz' | 'title_en' | 'title_ru' | 'abstract_uz' | 'abstract_en' | 'abstract_ru' | 'keywords_uz' | 'keywords_en' | 'keywords_ru'>) {
  const title = normalize([article.title_uz, article.title_en, article.title_ru].filter(Boolean).join(' '));
  const keywords = normalize([...(article.keywords_uz || []), ...(article.keywords_en || []), ...(article.keywords_ru || [])].join(' '));
  const abstract = normalize([article.abstract_uz, article.abstract_en, article.abstract_ru].filter(Boolean).join(' '));
  const scores = subjectCollections.filter(s => s.id !== 'multidisciplinary').map(subject => ({ id: subject.id,
    score: [...new Set(subject.terms.map(normalize))].reduce((score, term) => score + (termMatches(title, term) ? 5 : 0) + (termMatches(keywords, term) ? 4 : 0) + (termMatches(abstract, term) ? 1 : 0), 0),
  })).sort((a, b) => b.score - a.score);
  return scores[0].score > 0 && scores[0].score !== scores[1].score ? scores[0].id : 'multidisciplinary';
}
export function resolveSubjectId(article: Article): string { return findSubject(article.subject_id)?.id || classifyArticle(article); }

// Existing editorial metadata travels atomically with the article in the save RPC.
// The marker never appears in the UI, PDF, citation keywords or public descriptions.
const subjectMarker = /^\[AGM_SUBJECT:([a-z-]+)\]\r?\n?/;
export function readSubjectMetadata(notes?: string) {
  const id = notes?.match(subjectMarker)?.[1];
  return { subject_id: findSubject(id)?.id, submission_notes: notes?.replace(subjectMarker, '') || undefined };
}
export function writeSubjectMetadata(subjectId: string | undefined, notes?: string) {
  const content = readSubjectMetadata(notes).submission_notes || '';
  return findSubject(subjectId) ? `[AGM_SUBJECT:${subjectId}]\n${content}` : content || undefined;
}
