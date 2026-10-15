import type { Article, Language } from '@/types/journal';
export const subjectCollections = [
  { id: 'natural-sciences', labels: { uz: 'Tabiiy fanlar', en: 'Natural sciences', ru: 'Естественные науки' }, terms: ['physics', 'chemistry', 'mathemat', 'environment', 'ecolog', 'fizika', 'kimyo', 'matematik', 'ekolog', 'физик', 'хими', 'математ', 'эколог'] },
  { id: 'engineering-technology', labels: { uz: 'Muhandislik va texnologiya', en: 'Engineering & technology', ru: 'Инженерия и технологии' }, terms: ['energy', 'energet', 'energiya', 'энерг', 'engineer', 'technolog', 'comput', 'artificial intelligence', 'software', 'muhandis', 'texnolog', 'sunʼiy', 'sun’iy', "sun'iy", 'dastur', 'инженер', 'технолог', 'компьют', 'искусственн'] },
  { id: 'medicine-life-sciences', labels: { uz: 'Tibbiyot va hayot fanlari', en: 'Medicine & life sciences', ru: 'Медицина и биология' }, terms: ['biotech', 'biotex', 'биотех', 'medic', 'health', 'biolog', 'clinical', 'tibb', 'sog‘liq', 'salomat', 'biolog', 'медицин', 'здоров', 'биолог', 'клинич'] },
  { id: 'economics-business', labels: { uz: 'Iqtisodiyot va biznes', en: 'Economics & business', ru: 'Экономика и бизнес' }, terms: ['econom', 'business', 'financ', 'management', 'iqtisod', 'biznes', 'moliya', 'boshqaruv', 'эконом', 'бизнес', 'финанс', 'управлен'] },
  { id: 'social-sciences', labels: { uz: 'Ijtimoiy fanlar', en: 'Social sciences', ru: 'Социальные науки' }, terms: ['social', 'societ', 'sociolog', 'law', 'politic', 'ijtimoiy', 'jamiyat', 'huquq', 'siyos', 'социаль', 'обществ', 'социолог', 'право', 'полит'] },
  { id: 'education-humanities', labels: { uz: 'Ta’lim va gumanitar fanlar', en: 'Education & humanities', ru: 'Образование и гуманитарные науки' }, terms: ['educat', 'pedagog', 'linguist', 'histor', 'cultur', 'literat', 'ta’lim', "ta'lim", 'talim', 'tilshunos', 'tarix', 'madaniyat', 'adabiyot', 'образован', 'педагог', 'лингвист', 'истор', 'культур', 'литератур'] },
] as const;
export function findSubject(id?: string) { return subjectCollections.find(subject => subject.id === id); }
export function matchesSubject(article: Article, subject: NonNullable<ReturnType<typeof findSubject>>) {
  const text = [article.title_uz, article.title_en, article.title_ru, article.abstract_uz, article.abstract_en, article.abstract_ru, ...(article.keywords_uz || []), ...(article.keywords_en || []), ...(article.keywords_ru || [])].filter(Boolean).join(' ').toLocaleLowerCase().replace(/[\u2018\u2019\u02bc\u02bb`]/g, "'");
  return subject.terms.some(term => text.includes(term.replace(/[\u2018\u2019\u02bc\u02bb`]/g, "'")));
}
export function subjectLabel(id: string, lang: Language) { return findSubject(id)?.labels[lang]; }
