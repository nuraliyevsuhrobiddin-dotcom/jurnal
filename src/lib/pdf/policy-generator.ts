import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';
import { embedJournalFonts } from './generator';
import { generateQrPngBuffer } from './qr';
import type { JournalSettings, Language } from '@/types/journal';
import { POLICY_DATE, POLICY_VERSION, type PolicyDocument } from '@/types/policies';

const W = 595.28, H = 841.89, M = 48, BOTTOM = 64;
const navy = rgb(16 / 255, 43 / 255, 63 / 255);
const gold = rgb(23 / 255, 95 / 255, 91 / 255);
const ink = rgb(.12, .19, .24), muted = rgb(.31, .39, .45);
const text = (lang: Language, uz: string, en: string, ru: string) => lang === 'uz' ? uz : lang === 'ru' ? ru : en;

/** Break long URLs/tokens too; nothing is silently clipped or truncated. */
export function wrapPolicyText(value: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of value.replace(/\r/g, '').split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) { line = candidate; continue; }
      if (line) { lines.push(line); line = ''; }
      for (const character of word) {
        if (line && font.widthOfTextAtSize(line + character, size) > width) { lines.push(line); line = ''; }
        line += character;
      }
    }
    if (line) lines.push(line);
    if (!paragraph.trim()) lines.push('');
  }
  return lines;
}

export async function generatePolicyPdf(options: {
  documents: PolicyDocument[]; settings: JournalSettings; lang: Language;
  title: string; verificationUrl: string; hash: string;
}): Promise<Uint8Array> {
  const { documents, settings, lang, title, verificationUrl, hash } = options;
  const pdf = await PDFDocument.create();
  const { fontRegular, fontBold } = await embedJournalFonts(pdf);
  pdf.setTitle(title); pdf.setAuthor(settings.publisher); pdf.setSubject(`${settings.journal_name} — ${POLICY_VERSION}`);
  pdf.setCreator(settings.journal_name); pdf.setLanguage(lang);
  let page!: PDFPage; let y = 0;
  const chapterStarts: { title: string; page: number }[] = [];
  function nextPage() {
    page = pdf.addPage([W, H]);
    page.drawRectangle({ x: 0, y: H - 59, width: W, height: 59, color: rgb(.95, .97, .96) });
    const brand = wrapPolicyText(settings.journal_name, fontBold, 13, W - M * 2)[0];
    page.drawText(brand, { x: M, y: H - 31, size: 13, font: fontBold, color: navy });
    page.drawLine({ start: { x: M, y: H - 49 }, end: { x: W - M, y: H - 49 }, thickness: .8, color: gold });
    y = H - 82;
  }
  function ensure(height: number) { if (y - height < BOTTOM) nextPage(); }
  function paragraph(value: string, size = 10.5, font = fontRegular, color = ink, width = W - M * 2, indent = 0) {
    const lines = wrapPolicyText(value, font, size, width - indent);
    for (const line of lines) {
      ensure(size * 1.55);
      if (line) page.drawText(line, { x: M + indent, y, size, font, color });
      y -= size * 1.55;
    }
    y -= 7;
  }
  nextPage();
  paragraph(title, 23, fontBold, navy);
  paragraph(`${text(lang, 'Tahririyat hujjatlari', 'Editorial documents', 'Редакционные документы')} · ${POLICY_VERSION} · ${POLICY_DATE}`, 9, fontRegular, muted);
  paragraph(`${settings.publisher} | ${settings.contact_email}`, 9, fontRegular, muted);
  paragraph(text(lang,
    'Ushbu elektron nashr jurnalning mualliflar, taqrizchilar va o‘quvchilar uchun ochiq siyosatlarini taqdim etadi. Nashr belgisi jurnal brendini bildiradi; tasdiqlovchi shaxsning imzosi yoki qaror raqami kiritilmagan.',
    'This electronic edition presents the journal’s public policies for authors, reviewers and readers. The edition mark identifies the journal brand; no approving person’s signature or approval resolution is asserted.',
    'Электронное издание содержит публичные правила для авторов, рецензентов и читателей. Издательский знак обозначает бренд журнала; подпись утверждающего лица и номер решения об утверждении не заявлены.'), 9, fontRegular, muted);

  let contentsPage: PDFPage | null = null;
  if (documents.length > 1) {
    nextPage(); contentsPage = page;
    paragraph(text(lang, 'Mundarija', 'Contents', 'Содержание'), 19, fontBold, navy);
    nextPage();
  }
  for (const [index, document] of documents.entries()) {
    if (index > 0) nextPage();
    chapterStarts.push({ title: document.title, page: pdf.getPageCount() });
    if (documents.length > 1) paragraph(`${index + 1}. ${document.title}`, 17, fontBold, navy);
    paragraph(document.summary, 10.5, fontRegular, muted);
    for (const [sectionIndex, section] of document.sections.entries()) {
      const headingLines = wrapPolicyText(`${sectionIndex + 1}. ${section.title}`, fontBold, 12, W - M * 2);
      ensure(headingLines.length * 19 + 40);
      paragraph(`${sectionIndex + 1}. ${section.title}`, 12, fontBold, navy);
      for (const value of section.paragraphs) paragraph(value);
      for (const item of section.items || []) paragraph(`• ${item}`, 10.5, fontRegular, ink, W - M * 2, 8);
      y -= 4;
    }
    if (document.sources.length) {
      ensure(55);
      paragraph(text(lang, 'Tavsiyalar va havolalar', 'Guidance and references', 'Рекомендации и ссылки'), 11, fontBold, navy);
      for (const source of document.sources) {
        paragraph(source.label, 8.5, fontBold, muted);
        paragraph(source.url, 8, fontRegular, gold);
      }
    }
  }
  ensure(164);
  paragraph(text(lang, 'Elektron nashr ma’lumotlari', 'Electronic edition information', 'Сведения об электронном издании'), 11, fontBold, navy);
  const boxTop = y;
  page.drawRectangle({ x: M, y: boxTop - 116, width: W - M * 2, height: 124, color: rgb(.96, .97, .98), borderColor: rgb(.84, .88, .90), borderWidth: .7 });
  const qr = await pdf.embedPng(await generateQrPngBuffer(verificationUrl));
  page.drawImage(qr, { x: M + 10, y: boxTop - 89, width: 82, height: 82 });
  page.drawText(text(lang, 'Versiyani tekshirish', 'Check document version', 'Проверить версию'), { x: M + 8, y: boxTop - 102, size: 6.5, font: fontRegular, color: muted });
  const info = [`${text(lang, 'Versiya', 'Version', 'Версия')}: ${POLICY_VERSION}`, `${text(lang, 'Tahrir sanasi', 'Revision date', 'Дата редакции')}: ${POLICY_DATE}`, 'SHA-256:', hash];
  let infoY = boxTop - 12;
  for (const value of info) {
    for (const line of wrapPolicyText(value, fontRegular, 7.5, 256)) {
      page.drawText(line, { x: M + 108, y: infoY, size: 7.5, font: fontRegular, color: ink }); infoY -= 12;
    }
  }
  const cx = W - M - 55, cy = boxTop - 48;
  page.drawCircle({ x: cx, y: cy, size: 43, borderWidth: 1.6, borderColor: navy, borderOpacity: .8 });
  page.drawCircle({ x: cx, y: cy, size: 37, borderWidth: .7, borderColor: navy, borderOpacity: .8 });
  const centered = (value: string, position: number, size: number, font = fontBold) => page.drawText(value, { x: cx - font.widthOfTextAtSize(value, size) / 2, y: position, size, font, color: navy });
  centered('AGM', cy + 5, 18); centered('JOURNAL', cy - 9, 8.5);
  centered(`v${POLICY_VERSION}`, cy - 23, 6.5, fontRegular);
  centered(text(lang, 'ELEKTRON NASHR', 'ELECTRONIC EDITION', 'ЭЛЕКТРОННОЕ ИЗДАНИЕ'), boxTop - 106, 5.5, fontRegular);

  if (contentsPage) {
    let contentsY = H - 122;
    for (const [index, chapter] of chapterStarts.entries()) {
      const lines = wrapPolicyText(`${index + 1}. ${chapter.title}`, fontRegular, 9.5, W - M * 2 - 36);
      for (const [lineIndex, line] of lines.entries()) {
        contentsPage.drawText(line, { x: M, y: contentsY, size: 9.5, font: fontRegular, color: ink });
        if (lineIndex === 0) contentsPage.drawText(String(chapter.page), { x: W - M - 18, y: contentsY, size: 9.5, font: fontBold, color: navy });
        contentsY -= 14;
      }
      contentsY -= 10;
    }
  }
  const pages = pdf.getPages();
  pages.forEach((p, index) => {
    p.drawLine({ start: { x: M, y: 44 }, end: { x: W - M, y: 44 }, thickness: .5, color: rgb(.82, .86, .89) });
    p.drawText(`${POLICY_VERSION} · ${POLICY_DATE} · ${lang.toUpperCase()}`, { x: M, y: 29, size: 7.5, font: fontRegular, color: muted });
    p.drawText(`${index + 1} / ${pages.length}`, { x: W - M - 35, y: 29, size: 7.5, font: fontRegular, color: muted });
  });
  return pdf.save();
}
