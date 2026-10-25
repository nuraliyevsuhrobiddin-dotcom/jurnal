import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const Module = require('node:module');
const previousLoader = require.extensions['.ts'], previousResolve = Module._resolveFilename;
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
Module._resolveFilename = function (request, ...args) { return previousResolve.call(this, request.startsWith('@/') ? path.resolve('src', request.slice(2)) : request, ...args); };
process.env.VITEST = 'true'; // Synthetic preview only; no production data or writes.
try {
  const { PDFDocument, rgb } = require('pdf-lib');
  const { assemblePublicationPdf, embedJournalFonts } = require('../src/lib/pdf/generator.ts');
  const { journalStore } = require('../src/lib/data-store.ts');
  const directory = path.resolve('artifacts/publication-design');
  await mkdir(directory, { recursive: true });
  const sample = {
    ...journalStore.articles[0], id: 'b95ba2e1-4d55-48ce-a202-cd01d2bca1d7', slug: 'publication-design-sample', subject_id: 'education-humanities',
    original_language: 'uz', title_uz: 'Ta’lim bosqichlari o‘rtasidagi uzluksizlik: hamkorlik va moslashuv metodikasi',
    abstract_uz: 'Ushbu namuna AGM Journal maqolalarining yangi nashr dizaynini ko‘rsatadi. Maqola muqovasi, mualliflar va tashkilotlar, annotatsiya, kalit so‘zlar hamda iqtibos ma’lumotlari alohida joylashtiriladi. Asosiy matndagi rasmlar va diagrammalar o‘z nisbatida saqlanadi. Bu ilmiy natijalar e’lon qilinayotgan maqola emas, maketni baholash uchun tayyorlangan namuna hujjatidir.',
    keywords_uz: ['uzluksiz ta’lim', 'moslashuv', 'pedagogik hamkorlik'],
    title_en: 'Continuity across educational stages: collaboration and adaptation',
    abstract_en: 'This sample demonstrates the AGM Journal publication design. The cover brings together author identities, affiliations, an abstract, keywords and citation information. Figures and diagrams retain their proportions in the full-text pages. This is a layout demonstration and does not report scientific findings.',
    keywords_en: ['educational continuity', 'adaptation', 'collaboration'],
    title_ru: 'Преемственность образования: сотрудничество и адаптация',
    abstract_ru: 'Этот образец демонстрирует новый дизайн публикаций AGM Journal. Обложка объединяет сведения об авторах, организациях, аннотацию, ключевые слова и данные для цитирования. Рисунки и диаграммы сохраняют пропорции. Документ подготовлен для оценки макета и не содержит заявленных научных результатов.',
    keywords_ru: ['преемственность', 'адаптация', 'сотрудничество'],
    doi: undefined, issue: journalStore.issues[0], publication_date: '2026-10-25', page_first: 21, page_last: 22,
    authors: [{ id: 'sample-author', article_id: 'sample', full_name: 'Muallif ismi va familiyasi', affiliation: 'Tadqiqot muassasasi yoki universitet', country: 'O‘zbekiston', is_corresponding: true, email: 'author@example.org', order_index: 1 }],
  };
  const source = await PDFDocument.create();
  const fonts = await embedJournalFonts(source);
  const p = source.addPage([595.28, 841.89]);
  p.drawText('NAMUNA / DESIGN SAMPLE', { x: 48, y: 782, size: 9, font: fonts.fontBold, color: rgb(.4, .4, .4) });
  p.drawText('1. Kirish', { x: 48, y: 740, size: 20, font: fonts.fontBold });
  const lines = ['Mazkur sahifa maqolaning asosiy matni va ilmiy tasvirlari', 'jurnal dizaynida qanday joylashtirilishini ko‘rsatadi.', 'Rasm va diagrammalar maqola mazmunidan ajratib olinmaydi.', 'Ushbu sxema faqat maket namunasi; tadqiqot natijasi emas.'];
  lines.forEach((line, i) => p.drawText(line, { x: 48, y: 708 - i * 20, size: 12, font: fonts.fontRegular }));
  p.drawText('2. Tadqiqot tuzilishi', { x: 48, y: 560, size: 18, font: fonts.fontBold });
  ['Savol', 'Metod', 'Dalil', 'Xulosa'].forEach((label, i) => {
    const x = 48 + i * 128;
    p.drawRectangle({ x, y: 430, width: 110, height: 68, color: rgb(.92, .96, .95), borderWidth: 1, borderColor: rgb(.1, .4, .4) });
    p.drawText(label, { x: x + 13, y: 458, size: 12, font: fonts.fontBold });
    if (i < 3) p.drawLine({ start: { x: x + 112, y: 464 }, end: { x: x + 125, y: 464 }, thickness: 1, color: rgb(.1, .4, .4) });
  });
  p.drawText('1-rasm. Tadqiqot bosqichlari — namunaviy sxema.', { x: 48, y: 405, size: 10, font: fonts.fontRegular });
  p.drawText('3. Muhokama', { x: 48, y: 325, size: 18, font: fonts.fontBold });
  lines.slice(0, 3).forEach((line, i) => p.drawText(line, { x: 48, y: 290 - i * 20, size: 12, font: fonts.fontRegular }));
  const landscape = source.addPage([841.89, 595.28]);
  landscape.drawText('DIAGRAMMA / LANDSCAPE SAMPLE', { x: 55, y: 525, size: 20, font: fonts.fontBold });
  for (let i = 0; i < 6; i++) landscape.drawRectangle({ x: 80 + i * 112, y: 150, width: 65, height: 90 + i * 33, color: rgb(.1 + i * .05, .35, .4) });
  landscape.drawText('Namuna: raqamlar va ustunlar ilmiy natijani ifodalamaydi.', { x: 55, y: 80, size: 12, font: fonts.fontRegular });
  const original = await source.save();
  for (const lang of ['uz', 'en', 'ru']) {
    const filename = path.join(directory, `AGM-atlas-${lang}-sample.pdf`);
    await writeFile(filename, await assemblePublicationPdf({ ...sample, original_language: lang }, journalStore.settings, original));
    console.log(filename);
  }
} finally {
  Module._resolveFilename = previousResolve;
  if (previousLoader) require.extensions['.ts'] = previousLoader;
  else delete require.extensions['.ts'];
}
