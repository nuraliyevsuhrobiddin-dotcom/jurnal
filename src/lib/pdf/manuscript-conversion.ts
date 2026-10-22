import { PDFDocument, rgb } from 'pdf-lib';
import JSZip from 'jszip';
import { isDocxArchive } from '@/lib/docx-validation';
import { parseDocxFile } from './docx-parser';
import { embedJournalFonts, generatePublicationCoverPdf } from './generator';
import type { JournalSettings } from '@/types/journal';
import { policyIds } from '@/types/policies';
import { getPolicyDocument } from '@/lib/policies';
import type { Article } from '@/types/journal';

export class ManuscriptFileError extends Error {}

type ManuscriptRun = { text: string; bold: boolean };
type ManuscriptBlock = { tag: string; runs: ManuscriptRun[] };

function decodeHtml(value: string) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, key: string) => {
    const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
    if (key[0] !== '#') return named[key.toLowerCase()] || entity;
    const code = key[1]?.toLowerCase() === 'x' ? Number.parseInt(key.slice(2), 16) : Number.parseInt(key.slice(1), 10);
    try { return Number.isFinite(code) ? String.fromCodePoint(code) : entity; } catch { return entity; }
  });
}

function manuscriptBlocks(html: string): ManuscriptBlock[] {
  const blocks: ManuscriptBlock[] = [];
  let current: ManuscriptBlock | null = null;
  let bold = false;
  let listMode: 'ol' | 'ul' | null = null;
  let listIndex = 1;
  const flush = () => {
    if (!current) return;
    const runs = current.runs.map(run => ({ ...run, text: run.text.replace(/\s+/g, ' ') })).filter(run => run.text.trim());
    if (runs.length) blocks.push({ tag: current.tag, runs });
    current = null;
  };
  const tokens = /<\/?([a-z][a-z\d]*)\b[^>]*>|([^<]+)/gi;
  for (const match of html.matchAll(tokens)) {
    const tag = match[1]?.toLowerCase();
    if (!tag) {
      if (current && match[2]) {
        const text = decodeHtml(match[2]);
        const previous = current.runs.at(-1);
        if (previous?.bold === bold) previous.text += text;
        else current.runs.push({ text, bold });
      }
      continue;
    }
    const closing = match[0].startsWith('</');
    if (['strong', 'b'].includes(tag)) { bold = !closing; continue; }
    if (tag === 'ol' || tag === 'ul') {
      if (closing) listMode = null;
      else { flush(); listMode = tag; listIndex = 1; }
      continue;
    }
    if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li'].includes(tag)) {
      if (tag === 'p' && current?.tag === 'li') continue;
      if (closing) flush();
      else {
        flush(); current = { tag, runs: [] };
        if (tag === 'li') current.runs.push({ text: listMode === 'ol' ? `${listIndex++}. ` : '• ', bold: true });
      }
    } else if (tag === 'br' && current) current.runs.push({ text: ' ', bold });
  }
  flush();
  return blocks;
}

function manuscriptBodyBlocks(blocks: ManuscriptBlock[], article?: Article) {
  if (!article) return blocks;
  const textOf = (block: ManuscriptBlock) => block.runs.map(run => run.text).join(' ').replace(/\s+/g, ' ').trim();
  const normalized = (value: string) => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const headings = /^(?:\d+(?:\.\d+)*[.)]?\s*)?(introduction|background|literature review|materials and methods|methods|methodology|results|discussion|conclusion)\b/i;
  const sectionIndex = blocks.findIndex((block, index) => index < 32 && headings.test(textOf(block)));
  if (sectionIndex > 0) return blocks.slice(sectionIndex);

  const labels = /^(abstract|summary|keywords?|key words|index terms?|corresponding author|authors?|affiliations?)\b/i;
  const metadata = new Set([
    article.title_en, article.title_uz, article.title_ru,
    article.abstract_en, article.abstract_uz, article.abstract_ru,
    ...(article.authors || []).flatMap(author => [author.full_name, author.affiliation, author.email, author.orcid]),
    ...(article.keywords_en || []), ...(article.keywords_uz || []), ...(article.keywords_ru || []),
  ].filter(Boolean).map(value => normalized(String(value))));
  let start = 0;
  while (start < Math.min(blocks.length, 20)) {
    const value = textOf(blocks[start]);
    if (!value || labels.test(value) || metadata.has(normalized(value))) start++;
    else break;
  }
  return blocks.slice(start);
}

export function publicationBodyPageCount(doc: PDFDocument) {
  const marker = doc.getKeywords()?.match(/(?:^|\s)AGM_BODY_PAGES:(\d+)(?:\s|$)/)?.[1];
  const count = marker ? Number(marker) : doc.getPageCount();
  return Number.isSafeInteger(count) && count > 0 ? count : doc.getPageCount();
}

async function typesetDocx(html: string, settings: JournalSettings, article?: Article) {
  const pdf = await PDFDocument.create();
  const { fontRegular, fontBold } = await embedJournalFonts(pdf);
  const W = 595.28, H = 841.89, M = 54, top = H - 83, bottom = 62;
  const articleId = article ? `AGM-${article.id.replace(/-/g, '').slice(0, 8).toUpperCase()}` : '';
  let page = pdf.addPage([W, H]);
  let y = top;
  function frame() {
    page.drawText(settings.journal_name.toUpperCase(), { x: M, y: H - 32, size: 9, font: fontBold, color: rgb(0.063, 0.169, 0.247) });
    if (articleId) page.drawText(articleId, { x: W - M - 88, y: H - 32, size: 7.5, font: fontRegular, color: rgb(0.35, 0.41, 0.46) });
    page.drawLine({ start: { x: M, y: H - 42 }, end: { x: W - M, y: H - 42 }, thickness: 0.8, color: rgb(0.05, 0.38, 0.39) });
  }
  function nextPage() { page = pdf.addPage([W, H]); frame(); y = top; }
  function drawBlock(block: ManuscriptBlock, index: number) {
    const heading = /^h[1-6]$/.test(block.tag);
    const firstTitle = index === 0 && block.tag === 'p';
    const size = firstTitle ? 17 : block.tag === 'h1' ? 15 : block.tag === 'h2' ? 13 : block.tag === 'h3' ? 12 : heading ? 11 : 10.5;
    const lineHeight = firstTitle ? 22 : size * 1.55;
    const blockRuns = block.runs;
    const maxWidth = W - M * 2;
    let lineRuns: ManuscriptRun[] = [];
    let lineWidth = 0;
    const flushLine = () => {
      if (!lineRuns.length) return;
      if (y - lineHeight < bottom) nextPage();
      const alignCenter = firstTitle;
      let x = alignCenter ? (W - lineWidth) / 2 : M;
      for (const run of lineRuns) {
        const font = run.bold || heading || firstTitle ? fontBold : fontRegular;
        page.drawText(run.text, { x, y, size, font, color: heading || firstTitle ? rgb(0.063, 0.169, 0.247) : rgb(0.13, 0.17, 0.2) });
        x += font.widthOfTextAtSize(run.text, size);
      }
      y -= lineHeight;
      lineRuns = []; lineWidth = 0;
    };
    for (const run of blockRuns) {
      const parts = run.text.match(/\s+|\S+/g) || [];
      for (const part of parts) {
        if (/^\s+$/.test(part)) {
          if (lineRuns.length) {
            const font = run.bold || heading || firstTitle ? fontBold : fontRegular;
            lineRuns.push({ text: ' ', bold: run.bold || heading || firstTitle });
            lineWidth += font.widthOfTextAtSize(' ', size);
          }
          continue;
        }
        const font = run.bold || heading || firstTitle ? fontBold : fontRegular;
        const wordWidth = font.widthOfTextAtSize(part, size);
        const pendingSpace = lineRuns.length && lineRuns.at(-1)?.text !== ' ' ? font.widthOfTextAtSize(' ', size) : 0;
        if (lineWidth + pendingSpace + wordWidth > maxWidth && lineRuns.length) {
          if (lineRuns.at(-1)?.text === ' ') { lineRuns.pop(); lineWidth -= font.widthOfTextAtSize(' ', size); }
          flushLine();
        }
        if (lineRuns.length && lineRuns.at(-1)?.text !== ' ') {
          lineRuns.push({ text: ' ', bold: run.bold || heading || firstTitle });
          lineWidth += font.widthOfTextAtSize(' ', size);
        }
        if (wordWidth <= maxWidth) {
          lineRuns.push({ text: part, bold: run.bold || heading || firstTitle }); lineWidth += wordWidth;
        } else {
          for (const char of part) {
            const charWidth = font.widthOfTextAtSize(char, size);
            if (lineWidth + charWidth > maxWidth && lineRuns.length) flushLine();
            lineRuns.push({ text: char, bold: run.bold || heading || firstTitle }); lineWidth += charWidth;
          }
        }
      }
    }
    flushLine();
    y -= firstTitle ? 10 : heading ? 8 : 6;
  }
  frame();
  const blocks = manuscriptBodyBlocks(manuscriptBlocks(html), article);
  if (!blocks.length) throw new ManuscriptFileError('DOCX ichida o‘qiladigan maqola matni topilmadi.');
  blocks.forEach(drawBlock);
  pdf.getPages().forEach((sheet, index) => {
    sheet.drawLine({ start: { x: M, y: 48 }, end: { x: W - M, y: 48 }, thickness: 0.5, color: rgb(0.35, 0.41, 0.46) });
    sheet.drawText(articleId ? `${settings.journal_name}  |  ${articleId}` : settings.journal_name, { x: M, y: 31, size: 7, font: fontRegular, color: rgb(0.35, 0.41, 0.46) });
    sheet.drawText(`${index + 1} / ${pdf.getPageCount()}`, { x: W - M - 32, y: 31, size: 7, font: fontRegular, color: rgb(0.35, 0.41, 0.46) });
  });
  if (article) {
    const title = (article.original_language === 'en' ? article.title_en : article.original_language === 'ru' ? article.title_ru : article.title_uz) || article.title_uz;
    pdf.setTitle(title);
    pdf.setAuthor((article.authors || []).map(author => author.full_name).join(', '));
    pdf.setSubject(article.doi ? `https://doi.org/${article.doi}` : settings.journal_name);
  }
  pdf.setCreator(settings.journal_name);
  pdf.setKeywords(['AGM_FULL_ARTICLE_V2', `AGM_BODY_PAGES:${pdf.getPageCount()}`]);
  if (!article) return pdf.save();
  const bodyBytes = await pdf.save();
  const body = await PDFDocument.load(bodyBytes);
  const bodyFirst = article.page_first || 1;
  const coverArticle = { ...article, page_first: bodyFirst, page_last: bodyFirst + body.getPageCount() - 1 };
  const cover = await PDFDocument.load(await generatePublicationCoverPdf(coverArticle, settings));
  const publication = await PDFDocument.create();
  for (const source of [cover, body]) {
    const pages = await publication.copyPages(source, source.getPageIndices());
    pages.forEach(copied => publication.addPage(copied));
  }
  const title = (article.original_language === 'en' ? article.title_en : article.original_language === 'ru' ? article.title_ru : article.title_uz) || article.title_uz;
  publication.setTitle(title);
  publication.setAuthor((article.authors || []).map(author => author.full_name).join(', '));
  publication.setSubject(article.doi ? `https://doi.org/${article.doi}` : settings.journal_name);
  publication.setCreator(settings.journal_name);
  publication.setKeywords(['AGM_FULL_ARTICLE_V2', `AGM_BODY_PAGES:${body.getPageCount()}`]);
  return publication.save();
}

export function assertNotJournalDocument(doc: PDFDocument, settings: JournalSettings) {
  const title = doc.getTitle()?.trim();
  if (doc.getKeywords()?.includes('AGM_FULL_ARTICLE_V2')) throw new ManuscriptFileError('Bu jurnal uchun tayyorlangan PDF. Ramka takrorlanmasligi uchun asl PDF yoki DOCX qo‘lyozmani yuklang.');
  if (doc.getKeywords()?.includes('AGM_METADATA_ONLY')) throw new ManuscriptFileError('Bu faqat annotatsiya varag‘i. To‘liq maqola faylini tanlang.');
  const titles = ['Publication policies handbook', 'Nashr siyosatlari to‘plami', 'Редакционные политики'];
  for (const lang of ['en', 'uz', 'ru'] as const) for (const id of policyIds) titles.push(getPolicyDocument(id, lang, settings).title);
  if (title && titles.includes(title) && doc.getCreator() === settings.journal_name) throw new ManuscriptFileError('Jurnal qo‘llanmasi tanlangan. Ilmiy maqolaning o‘z PDF yoki DOCX faylini yuklang.');
}

export async function manuscriptToPdf(bytes: Uint8Array, extension: string, settings: JournalSettings, article?: Article): Promise<Uint8Array> {
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
  return typesetDocx(parsed.htmlContent, settings, article);
}
