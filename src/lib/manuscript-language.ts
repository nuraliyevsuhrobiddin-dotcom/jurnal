export type LanguageCheck = { status: 'english' | 'non_english' | 'uncertain'; message: string };

const englishWords = new Set('the and of to in a is are was were this that with for from by as an on we our these their it has have not which can be been study research results methods analysis data findings using between showed significant'.split(' '));
const otherWords = new Set('va uchun bilan bir bu ham ning ni da dan ga uning ushbu tadqiqot natijalar maqola hisoblanadi orqali mais les des une est dans pour avec sont nous notre cette los las del una que por con para como der die das und ist ein eine mit auf den von zu'.split(' '));

/** Conservative screening, not proof of language: ambiguous text needs editorial review. */
export function checkManuscriptLanguage(text: string): LanguageCheck {
  const words = text.toLowerCase().match(/\p{L}+/gu) || [];
  const letters = (text.match(/\p{L}/gu) || []).length;
  const latin = (text.match(/\p{Script=Latin}/gu) || []).length;
  const english = words.filter(word => englishWords.has(word)).length;
  const other = words.filter(word => otherWords.has(word)).length;
  if ((letters >= 60 && latin / letters < 0.65) || (words.length >= 20 && other >= 5 && other > english * 2)) {
    return { status: 'non_english', message: 'This text appears to be in another language. Submit an English manuscript or correct the extracted text.' };
  }
  if (words.length >= 20 && english >= 5 && english / words.length >= 0.12 && english > other * 2) {
    return { status: 'english', message: 'The language check suggests English. Please verify the manuscript yourself.' };
  }
  return { status: 'uncertain', message: 'English could not be confirmed automatically. Confirm the manuscript is in English; the editorial office will verify it.' };
}
