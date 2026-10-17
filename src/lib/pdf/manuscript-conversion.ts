import { PDFDocument, rgb } from 'pdf-lib';
import JSZip from 'jszip';
import { isDocxArchive } from '@/lib/docx-validation';
import { parseDocxFile } from './docx-parser';
import { embedJournalFonts, wrapPublicationText } from './generator';
import type { JournalSettings } from '@/types/journal';
import { policyIds } from '@/types/policies';
import { getPolicyDocument } from '@/lib/policies';

export class ManuscriptFileError extends Error {}

export function assertNotJournalDocument(doc: PDFDocument, settings: JournalSettings) {
  const title = doc.getTitle()?.trim();
  if (doc.getKeywords()?.includes('AGM_FULL_ARTICLE_V2')) throw new ManuscriptFileError('Bu jurnal uchun tayyorlangan PDF. Ramka takrorlanmasligi uchun asl PDF yoki DOCX qo‘lyozmani yuklang.');
  if (doc.getKeywords()?.includes('AGM_METADATA_ONLY')) throw new ManuscriptFileError('Bu faqat annotatsiya varag‘i. To‘liq maqola faylini tanlang.');
  const titles = ['Publication policies handbook', 'Nashr siyosatlari to‘plami', 'Редакционные политики'];
  for (const lang of ['en', 'uz', 'ru'] as const) for (const id of policyIds) titles.push(getPolicyDocument(id, lang, settings).title);
  if (title && titles.includes(title) && doc.getCreator() === settings.journal_name) throw new ManuscriptFileError('Jurnal qo‘llanmasi tanlangan. Ilmiy maqolaning o‘z PDF yoki DOCX faylini yuklang.');
}

export async function manuscriptToPdf(bytes: Uint8Array, extension: string, settings: JournalSettings): Promise<Uint8Array> {
  if (extension === 'pdf') {
    let doc: PDFDocument;
    try { doc = await PDFDocument.load(bytes); } catch { throw new ManuscriptFileError('PDF o‘qilmadi. Buzilmagan, parolsiz PDF faylini tanlang.'); }
    if (!doc.getPageCount()) throw new ManuscriptFileError('PDF sahifalari bo‘sh.');
    assertNotJournalDocument(doc, settings);
    return bytes;
  }
  if (extension !== 'docx' || !isDocxArchive(bytes)) throw new ManuscriptFileError('To‘liq maqolani PDF yoki DOCX formatida tanlang.');
  const zip = await JSZip.loadAsync(bytes);
  const xml = await zip.file('word/document.xml')?.async('string') || '';
  // Never silently discard scientific figures, equations, tables or notes.
  if (/<(?:m:oMath|w:(?:drawing|pict|tbl|object|footnoteReference|endnoteReference))\b/.test(xml)) {
    throw new ManuscriptFileError('Bu DOCX’da jadval, rasm, formula yoki izoh bor. Ularni to‘liq saqlash uchun Word’dan PDF sifatida saqlang va shu PDF’ni tanlang.');
  }
  const parsed = await parseDocxFile(Buffer.from(bytes));
  if (!parsed.success || !parsed.rawText.trim()) throw new ManuscriptFileError('DOCX ichida o‘qiladigan maqola matni topilmadi.');
  if (parsed.warnings.some(w => /unrecogn|unsupported|ignored/i.test(w))) throw new ManuscriptFileError('DOCX’dagi ayrim qismlarni xavfsiz o‘girish imkoni yo‘q. Word’dan PDF qilib yuklang.');
  const pdf = await PDFDocument.create();
  const { fontRegular } = await embedJournalFonts(pdf);
  let page = pdf.addPage([595.28, 841.89]), y = 785;
  for (const line of wrapPublicationText(parsed.rawText, 499, 11, fontRegular)) {
    if (y < 58) { page = pdf.addPage([595.28, 841.89]); y = 785; }
    page.drawText(line, { x: 48, y, size: 11, font: fontRegular, color: rgb(.1, .14, .18) }); y -= 16;
  }
  return pdf.save();
}
