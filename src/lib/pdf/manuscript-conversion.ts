import { PDFDocument, rgb } from 'pdf-lib';
import JSZip from 'jszip';
import { isDocxArchive } from '@/lib/docx-validation';
import { parseDocxFile } from './docx-parser';
import { attachPublicationCover, embedJournalFonts, wrapPublicationText } from './generator';
import { drawBodyIdentity, embedPublicationSeal, publicationAccent } from './publication-design';
import type { JournalSettings } from '@/types/journal';
import { policyIds } from '@/types/policies';
import { getPolicyDocument } from '@/lib/policies';
import type { Article } from '@/types/journal';
import sharp from 'sharp';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

export class ManuscriptFileError extends Error {}

/** Retain common Word equations as unambiguous linear mathematical notation. */
export function linearizeWordEquations(xml: string) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const mathNS = 'http://schemas.openxmlformats.org/officeDocument/2006/math';
  const wordNS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  type MathNode = Element;
  function expression(node: MathNode): string {
    const children = Array.from(node.childNodes).filter(child => child.nodeType === 1) as MathNode[];
    const part = (name: string) => children.filter(child => child.localName === name).map(expression).join('');
    if (node.localName === 't') return node.textContent || '';
    if (node.localName?.endsWith('Pr')) return '';
    switch (node.localName) {
      case 'f': return `(${part('num')})/(${part('den')})`;
      case 'sSup': return `${part('e')}^(${part('sup')})`;
      case 'sSub': return `${part('e')}_(${part('sub')})`;
      case 'sSubSup': return `${part('e')}_(${part('sub')})^(${part('sup')})`;
      case 'rad': return part('deg') ? `root(${part('deg')}, ${part('e')})` : `sqrt(${part('e')})`;
      case 'd': {
        const props = children.find(child => child.localName === 'dPr');
        const character = (name: string, fallback: string) => props?.getElementsByTagNameNS(mathNS, name)[0]?.getAttributeNS(mathNS, 'val') ?? fallback;
        return character('begChr', '(') + children.filter(child => child.localName === 'e').map(expression).join(character('sepChr', '|')) + character('endChr', ')');
      }
      case 'acc': case 'bar': case 'groupChr': case 'borderBox': case 'box': case 'nary': case 'm': case 'limLow': case 'limUpp':
        throw new ManuscriptFileError('Murakkab Word formulasi topildi. Formulani oddiy matematik yozuvga aylantiring yoki PDF yuklang.');
      default:
        if (node.namespaceURI === mathNS && !['oMath', 'r', 'e', 'num', 'den', 'sup', 'sub', 'deg', 'fName', 'func'].includes(node.localName || '')) {
          throw new ManuscriptFileError('Bu Word formulasi hali qo‘llab-quvvatlanmaydi. Formulani oddiy matematik yozuvga aylantiring yoki PDF yuklang.');
        }
        return children.map(expression).join('');
    }
  }
  for (const math of Array.from(doc.getElementsByTagNameNS(mathNS, 'oMath'))) {
    const run = doc.createElementNS(wordNS, 'w:r');
    const text = doc.createElementNS(wordNS, 'w:t');
    text.appendChild(doc.createTextNode(expression(math)));
    run.appendChild(text);
    math.parentNode!.replaceChild(run, math);
  }
  for (const paragraph of Array.from(doc.getElementsByTagNameNS(mathNS, 'oMathPara'))) {
    const replacement = doc.createElementNS(wordNS, 'w:p');
    for (const child of Array.from(paragraph.childNodes)) {
      if (child.nodeType === 1 && (child as MathNode).namespaceURI === wordNS) replacement.appendChild(child);
    }
    paragraph.parentNode!.replaceChild(replacement, paragraph);
  }
  return new XMLSerializer().serializeToString(doc);
}

type ManuscriptRun = { text: string; bold: boolean; script?: 'sup' | 'sub' };
type ManuscriptBlock = { tag: string; runs: ManuscriptRun[]; image?: string; cells?: { text: string; span: number }[] };

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
  const tables: ManuscriptBlock[][] = [];
  html = html.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, table => {
    if (/<(?:img|table)\b/i.test(table.replace(/^<table\b[^>]*>/i, ''))) {
      throw new ManuscriptFileError('Ichma-ich jadval yoki jadval ichidagi rasmni avtomatik joylashtirish imkoni bo‘lmadi. Jadvalni soddalashtiring yoki PDF yuklang.');
    }
    const rows = Array.from(table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi), row => ({
      tag: 'tr', runs: [], cells: Array.from(row[1].matchAll(/<t[dh]\b([^>]*)>([\s\S]*?)<\/t[dh]>/gi), cell => ({
        text: decodeHtml(cell[2].replace(/<\/(?:p|li)>|<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, '')).trim(),
        span: Math.max(1, Number(cell[1].match(/colspan="(\d+)"/i)?.[1] || 1)),
      })),
    }));
    tables.push(rows);
    return `<agm-table data-index="${tables.length - 1}"/>`;
  });
  let current: ManuscriptBlock | null = null;
  let bold = false;
  let script: ManuscriptRun['script'];
  let listMode: 'ol' | 'ul' | null = null;
  let listIndex = 1;
  const flush = () => {
    if (!current) return;
    const runs = current.runs.map(run => ({ ...run, text: run.text.replace(/\s+/g, ' ') }));
    if (runs.some(run => run.text.trim())) blocks.push({ tag: current.tag, runs });
    current = null;
  };
  const tokens = /<\/?([a-z][a-z\d-]*)\b[^>]*>|([^<]+)/gi;
  for (const match of html.matchAll(tokens)) {
    const tag = match[1]?.toLowerCase();
    if (!tag) {
      if (current && match[2]) {
        const text = decodeHtml(match[2]);
        const previous = current.runs.at(-1);
        if (previous?.bold === bold && previous.script === script) previous.text += text;
        else current.runs.push({ text, bold, ...(script ? { script } : {}) });
      }
      continue;
    }
    const closing = match[0].startsWith('</');
    if (tag === 'agm-table') { flush(); blocks.push(...tables[Number(match[0].match(/data-index="(\d+)"/)?.[1])]); continue; }
    if (tag === 'img') {
      const src = match[0].match(/\bsrc="([^"]+)"/i)?.[1];
      if (!src?.startsWith('data:image/')) throw new ManuscriptFileError('Word rasmi o‘qilmadi. Rasmni hujjat ichiga joylang.');
      const paragraphTag: string = current?.tag || 'p';
      flush(); blocks.push({ tag: 'img', runs: [], image: src });
      current = { tag: paragraphTag, runs: [] };
      continue;
    }
    if (tag === 'sup' || tag === 'sub') { script = closing ? undefined : tag; continue; }
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

export function manuscriptBodyBlocks(blocks: ManuscriptBlock[], article?: Article) {
  if (!article) return blocks;
  const textOf = (block: ManuscriptBlock) => block.runs.map(run => run.text).join('').replace(/\s+/g, ' ').trim();
  const normalized = (value: string) => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  // Remove only metadata reproduced verbatim on the cover. A later "Results"
  // paragraph or a structured abstract must never erase earlier research text.
  const labels = /^(?:abstract|summary|keywords?|key words|index terms?|corresponding author|authors?|affiliations?|annotatsiya|аннотация|ключевые слова|kalit so[‘’ʻʼ'`]?zlar)\s*[:：]\s*/i;
  const metadata = new Set([
    article.title_en, article.title_uz, article.title_ru,
    article.abstract_en, article.abstract_uz, article.abstract_ru,
    ...(article.authors || []).flatMap(author => [author.full_name, author.affiliation, author.email, author.orcid]),
    ...(article.keywords_en || []), ...(article.keywords_uz || []), ...(article.keywords_ru || []),
    article.keywords_en?.join(' '), article.keywords_uz?.join(' '), article.keywords_ru?.join(' '),
  ].filter(Boolean).map(value => normalized(String(value))));
  let start = 0;
  while (start < Math.min(blocks.length, 20)) {
    const value = textOf(blocks[start]);
    if (blocks[start].image || blocks[start].cells) break;
    if (!value || metadata.has(normalized(value.replace(labels, '')))) start++;
    else break;
  }
  return blocks.slice(start);
}

export function publicationBodyPageCount(doc: PDFDocument) {
  const marker = doc.getKeywords()?.match(/(?:^|\s)AGM_BODY_PAGES:(\d+)(?:\s|$)/)?.[1];
  const count = marker ? Number(marker) : doc.getPageCount();
  return Number.isSafeInteger(count) && count > 0 && count <= doc.getPageCount() ? count : doc.getPageCount();
}

async function typesetDocx(html: string, settings: JournalSettings, article?: Article) {
  const pdf = await PDFDocument.create();
  const { fontRegular, fontBold } = await embedJournalFonts(pdf);
  const seal = article ? await embedPublicationSeal(pdf) : null;
  const W = 595.28, H = 841.89, M = 54, top = H - 83, bottom = 62;
  const articleId = article ? `AGM-${article.id.replace(/-/g, '').slice(0, 8).toUpperCase()}` : '';
  let page = pdf.addPage([W, H]);
  let y = top;
  function frame() {
    if (article) return; // The shared publication identity is drawn after pagination.
    const journal = settings.journal_name.toUpperCase();
    const journalSize = Math.min(9, (W - M * 2 - 105) / Math.max(fontBold.widthOfTextAtSize(journal, 1), 1));
    page.drawText(journal, { x: M, y: H - 32, size: journalSize, font: fontBold, color: rgb(0.063, 0.169, 0.247) });
    if (articleId) page.drawText(articleId, { x: W - M - 88, y: H - 32, size: 7.5, font: fontRegular, color: rgb(0.35, 0.41, 0.46) });
    page.drawLine({ start: { x: M, y: H - 42 }, end: { x: W - M, y: H - 42 }, thickness: 0.8, color: rgb(0.05, 0.38, 0.39) });
  }
  function nextPage() { page = pdf.addPage([W, H]); frame(); y = top; }
  function drawBlock(block: ManuscriptBlock, index: number) {
    const heading = /^h[1-6]$/.test(block.tag);
    const firstTitle = !article && index === 0 && block.tag === 'p';
    const size = firstTitle ? 17 : block.tag === 'h1' ? 15 : block.tag === 'h2' ? 13 : block.tag === 'h3' ? 12 : heading ? 11 : 10.5;
    const lineHeight = firstTitle ? 22 : size * 1.55;
    if (heading && y - lineHeight * 3 < bottom) nextPage();
    if (heading && article) page.drawRectangle({ x: M - 10, y: y - 3, width: 3, height: size + 3, color: publicationAccent(article) });
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
        page.drawText(run.text, { x, y: y + (run.script === 'sup' ? size * 0.35 : run.script === 'sub' ? -size * 0.2 : 0), size: run.script ? size * 0.7 : size, font, color: heading || firstTitle ? rgb(0.063, 0.169, 0.247) : rgb(0.13, 0.17, 0.2) });
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
        if (lineWidth + wordWidth > maxWidth && lineRuns.length) {
          if (lineRuns.at(-1)?.text === ' ') { lineRuns.pop(); lineWidth -= font.widthOfTextAtSize(' ', size); }
          flushLine();
        }
        if (wordWidth <= maxWidth) {
          lineRuns.push({ ...run, text: part, bold: run.bold || heading || firstTitle }); lineWidth += wordWidth;
        } else {
          for (const char of part) {
            const charWidth = font.widthOfTextAtSize(char, size);
            if (lineWidth + charWidth > maxWidth && lineRuns.length) flushLine();
            lineRuns.push({ ...run, text: char, bold: run.bold || heading || firstTitle }); lineWidth += charWidth;
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
  const tableColumns = Math.max(1, ...blocks.filter(block => block.cells).map(block => block.cells!.reduce((sum, cell) => sum + cell.span, 0)));
  for (const [index, block] of blocks.entries()) {
    if (block.image) {
      const base64 = block.image.match(/^data:image\/[^;]+;base64,([\s\S]+)$/)?.[1];
      if (!base64) throw new ManuscriptFileError('Word rasmi o‘qilmadi.');
      const image = await pdf.embedPng(await sharp(Buffer.from(base64, 'base64'), { limitInputPixels: 25000000 }).rotate().png().toBuffer());
      const dimensions = image.scaleToFit(W - M * 2, top - bottom - 16);
      if (y - dimensions.height < bottom) nextPage();
      page.drawImage(image, { x: (W - dimensions.width) / 2, y: y - dimensions.height, ...dimensions });
      y -= dimensions.height + 12;
    } else if (block.cells?.length) {
      const cellWidth = (W - M * 2) / tableColumns;
      const lines = block.cells.map(cell => wrapPublicationText(cell.text, cellWidth * cell.span - 12, 9, fontRegular));
      let offset = 0;
      const count = Math.max(...lines.map(cell => cell.length));
      while (offset < count) {
        if (y - 30 < bottom) nextPage();
        const take = Math.min(count - offset, Math.floor((y - bottom - 12) / 14));
        const height = take * 14 + 12;
        let x = M;
        block.cells.forEach((cell, cellIndex) => {
          const width = cellWidth * cell.span;
          page.drawRectangle({ x, y: y - height, width, height, borderWidth: 0.5, borderColor: rgb(0.5, 0.6, 0.6) });
          lines[cellIndex].slice(offset, offset + take).forEach((line, lineIndex) => page.drawText(line, { x: x + 6, y: y - 15 - lineIndex * 14, size: 9, font: fontRegular }));
          x += width;
        });
        y -= height; offset += take;
        if (offset < count) nextPage();
      }
      y -= 6;
    } else drawBlock(block, index);
  }
  pdf.getPages().forEach((sheet, index) => {
    if (article) {
      drawBodyIdentity(sheet, article, settings.journal_name, { fontRegular, fontBold }, index, pdf.getPageCount());
      if (seal) sheet.drawImage(seal, { x: 32, y: H - 36, width: 18, height: 18 });
      return;
    }
    sheet.drawLine({ start: { x: M, y: 48 }, end: { x: W - M, y: 48 }, thickness: 0.5, color: rgb(0.35, 0.41, 0.46) });
    const footer = articleId ? `${settings.journal_name}  |  ${articleId}` : settings.journal_name;
    const footerSize = Math.min(7, (W - M * 2 - 130) / Math.max(fontRegular.widthOfTextAtSize(footer, 1), 1));
    sheet.drawText(footer, { x: M, y: 31, size: footerSize, font: fontRegular, color: rgb(0.35, 0.41, 0.46) });
    const number = `${index + 1} / ${pdf.getPageCount()}`;
    sheet.drawText(number, { x: W - M - fontRegular.widthOfTextAtSize(number, 7), y: 31, size: 7, font: fontRegular, color: rgb(0.35, 0.41, 0.46) });
  });
  if (article) {
    const title = (article.original_language === 'en' ? article.title_en : article.original_language === 'ru' ? article.title_ru : article.title_uz) || article.title_uz;
    pdf.setTitle(title);
    pdf.setAuthor((article.authors || []).map(author => author.full_name).join(', '));
    pdf.setSubject(article.doi ? `https://doi.org/${article.doi}` : settings.journal_name);
  }
  pdf.setCreator(settings.journal_name);
  pdf.setKeywords(['AGM_FULL_ARTICLE_V2', `AGM_BODY_PAGES:${pdf.getPageCount()}`, `AGM_BODY_FIRST:${article?.page_first || 1}`]);
  if (!article) return pdf.save();
  return attachPublicationCover(article, settings, await pdf.save());
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
  // Embedded objects and legacy Symbol fonts need a full office rendering engine.
  if (/<w:(?:pict|object|sym|txbxContent)\b/.test(xml)) {
    throw new ManuscriptFileError('Bu DOCX’da eski Word obyekti yoki maxsus Symbol belgisi bor. Word’dan PDF sifatida saqlang yoki obyektni oddiy matn/rasmga aylantiring.');
  }
  let input = bytes;
  if (/<m:oMath\b/.test(xml)) {
    zip.file('word/document.xml', linearizeWordEquations(xml));
    input = await zip.generateAsync({ type: 'uint8array' });
  }
  const parsed = await parseDocxFile(Buffer.from(input));
  if (!parsed.success || !parsed.rawText.trim()) throw new ManuscriptFileError('DOCX ichida o‘qiladigan maqola matni topilmadi.');
  if (parsed.warnings.some(w => /unrecogn|unsupported|ignored/i.test(w))) throw new ManuscriptFileError('DOCX’dagi ayrim qismlarni xavfsiz o‘girish imkoni yo‘q. Word’dan PDF qilib yuklang.');
  return typesetDocx(parsed.htmlContent, settings, article);
}
