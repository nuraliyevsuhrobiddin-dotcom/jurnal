import { PDFDocument, PDFFont, degrees, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { generateQrPngBuffer } from './qr';
import { Article, Certificate, Issue, JournalSettings } from '@/types/journal';
import { isValidIssn } from '@/lib/identifiers';
import { resolveSubjectId, subjectLabel } from '@/lib/subjects';

// Helper to wrap text into lines fitting within maxWidth
export async function embedJournalFonts(pdfDoc: PDFDocument) {
  pdfDoc.registerFontkit(fontkit);
  const [regular, bold] = await Promise.all([
    readFile(path.join(process.cwd(), 'public/fonts/NotoSans-Regular.ttf')),
    readFile(path.join(process.cwd(), 'public/fonts/NotoSans-Bold.ttf')),
  ]);
  return {
    fontRegular: await pdfDoc.embedFont(regular, { subset: true }),
    fontBold: await pdfDoc.embedFont(bold, { subset: true }),
    fontOblique: await pdfDoc.embedFont(regular, { subset: true }),
  };
}

/** Wrap every Unicode token, including long identifiers and URLs. */
export function wrapPublicationText(text: string, maxWidth: number, fontSize: number, font: PDFFont): string[] {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r/g, '').split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (font.widthOfTextAtSize(line ? `${line} ${word}` : word, fontSize) <= maxWidth) {
        line = line ? `${line} ${word}` : word;
        continue;
      }
      if (line) { lines.push(line); line = ''; }
      for (const char of word) {
        if (line && font.widthOfTextAtSize(line + char, fontSize) > maxWidth) { lines.push(line); line = ''; }
        line += char;
      }
    }
    lines.push(line);
  }
  return lines;
}
const wrapText = wrapPublicationText;
const navy = rgb(0.063, 0.169, 0.247), teal = rgb(0.05, 0.38, 0.39), muted = rgb(0.35, 0.41, 0.46);
function fitFont(value: string, font: PDFFont, maximum: number, width: number) {
  return Math.min(maximum, width / Math.max(font.widthOfTextAtSize(value, 1), 1));
}

// 1. GENERATE AUTHOR CERTIFICATE PDF
export async function generateCertificatePdf(
  cert: Certificate,
  verificationUrl: string,
  settings?: JournalSettings
): Promise<Uint8Array> {
  if (cert.status !== 'valid') throw new Error('Certificate revoked');
  const doc = await PDFDocument.create();
  const { fontBold, fontRegular } = await embedJournalFonts(doc);
  const W = 841.89, H = 595.28;
  const navy = rgb(0.063, 0.169, 0.247), teal = rgb(0.06, 0.38, 0.39);
  const gold = teal, muted = rgb(0.38, 0.43, 0.46);
  const qr = await doc.embedPng(await generateQrPngBuffer(verificationUrl));
  let page = doc.addPage([W, H]);
  let y = H - 185;
  const journalName = cert.journal_name || settings?.journal_name || 'AGM Journal';
  function frame() {
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(1, 1, 1) });
    page.drawRectangle({ x: 25, y: 25, width: W - 50, height: H - 50, borderColor: gold, borderWidth: 0.8 });
    page.drawRectangle({ x: W - 192, y: 26, width: 166, height: H - 52, color: navy });
    page.drawText('AGM', { x: W - 165, y: H - 86, size: 32, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('JOURNAL', { x: W - 163, y: H - 109, size: 11, font: fontRegular, color: rgb(0.75, 0.84, 0.83) });
    page.drawImage(qr, { x: W - 163, y: 147, width: 110, height: 110 });
    page.drawText('SCAN TO VERIFY', { x: W - 158, y: 129, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('ONLINE REGISTRY', { x: W - 158, y: 115, size: 7, font: fontRegular, color: rgb(0.75, 0.84, 0.83) });
    page.drawText(journalName.toUpperCase(), { x: 54, y: H - 74, size: fitFont(journalName.toUpperCase(), fontBold, 19, W - 276), font: fontBold, color: navy });
    page.drawLine({ start: { x: 54, y: H - 91 }, end: { x: W - 218, y: H - 91 }, thickness: 1.3, color: teal });
    page.drawText(doc.getPageCount() === 1 ? 'SERTIFIKAT / CERTIFICATE' : 'CERTIFICATE / CONTINUED', { x: 54, y: H - 130, size: 24, font: fontBold, color: gold });
    page.drawText('ILMIY MAQOLA NASHRI  /  SCIENTIFIC PUBLICATION', { x: 54, y: H - 149, size: 8, font: fontRegular, color: muted });
  }
  frame();
  function text(value: string, size: number, bold = false, color = navy, gap = size * 1.4) {
    const font = bold ? fontBold : fontRegular;
    const clean = value.replace(/[\r\n\t]+/g, ' ');
    for (const line of wrapText(clean, W - 276, size, font)) {
      if (y < 134) { page = doc.addPage([W, H]); frame(); y = H - 185; }
      page.drawText(line, { x: 54, y, size, font, color }); y -= gap;
    }
  }
  text('Taqdim etiladi / Presented to', 9, false, muted);
  y -= 7;
  text(cert.author_name, 24, true);
  if (cert.author_affiliation) text(cert.author_affiliation, 9, false, muted);
  y -= 15;
  text('Quyidagi ilmiy maqola jurnalimizda nashr etilganini tasdiqlaydi:', 9, false, muted);
  text('This certificate records authorship of the following published article:', 9, false, muted);
  y -= 8;
  text(cert.article_title, 14, true);
  y -= 10;
  text(`Jild / Volume ${cert.issue_volume}  \u00b7  Son / Issue ${cert.issue_number}  \u00b7  ${cert.issue_year}`, 10, true, teal);
  text(`Nashr sanasi / Publication date: ${cert.issue_date}`, 9, false, muted);
  if (settings && isValidIssn(settings.issn_online)) text(`ISSN: ${settings.issn_online}`, 8, false, muted);
  doc.getPages().forEach((sheet, index) => {
    sheet.drawLine({ start: { x: 54, y: 108 }, end: { x: W - 218, y: 108 }, thickness: 0.6, color: gold });
    sheet.drawText(cert.certificate_number, { x: 54, y: 87, size: fitFont(cert.certificate_number, fontBold, 9, W - 276), font: fontBold, color: navy });
    sheet.drawText(`Tekshiruv kodi / Verification: ${cert.verification_code}`, { x: 54, y: 70, size: fitFont(`Tekshiruv kodi / Verification: ${cert.verification_code}`, fontRegular, 8, W - 276), font: fontRegular, color: muted });
    sheet.drawText('AGM Journal tahririyati / Editorial office', { x: 54, y: 50, size: 8, font: fontRegular, color: teal });
    sheet.drawText(`${index + 1} / ${doc.getPageCount()}`, { x: W - 88, y: 53, size: 8, font: fontRegular, color: rgb(1, 1, 1) });
  });
  doc.setTitle(`Certificate \u2014 ${cert.author_name}`); doc.setAuthor(journalName);
  doc.setSubject(cert.certificate_number); doc.setKeywords([cert.certificate_number, cert.verification_code]);
  return doc.save();
}

// 2. GENERATE ARTICLE TITLE / COVER SHEET PDF
export async function generateArticleTitlePagePdf(
  article: Article,
  settings: JournalSettings
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const { fontBold, fontRegular } = await embedJournalFonts(doc);
  const width = 595.28, height = 841.89, margin = 44;
  const navy = rgb(0.063, 0.169, 0.247), teal = rgb(0.05, 0.38, 0.39);
  const ink = rgb(0.13, 0.17, 0.2), muted = rgb(0.38, 0.43, 0.47);
  const lang = article.original_language;
  const title = (lang === 'ru' ? article.title_ru : lang === 'en' ? article.title_en : article.title_uz) || article.title_uz;
  const abstract = (lang === 'ru' ? article.abstract_ru : lang === 'en' ? article.abstract_en : article.abstract_uz) || article.abstract_uz;
  const keywords = (lang === 'ru' ? article.keywords_ru : lang === 'en' ? article.keywords_en : article.keywords_uz) || article.keywords_uz || [];
  const labels = lang === 'uz'
    ? { abstract: 'ANNOTATSIYA', keywords: 'Kalit so‘zlar', citation: 'IQTIBOS UCHUN', volume: 'Jild', issue: 'Son', pages: 'Sahifalar', date: 'Nashr sanasi', id: 'Maqola ID', pending: 'Belgilanmagan', author: 'Mas’ul muallif' }
    : lang === 'ru'
    ? { abstract: 'АННОТАЦИЯ', keywords: 'Ключевые слова', citation: 'КАК ЦИТИРОВАТЬ', volume: 'Том', issue: 'Выпуск', pages: 'Страницы', date: 'Опубликовано', id: 'ID статьи', pending: 'Не назначено', author: 'Автор для переписки' }
    : { abstract: 'ABSTRACT', keywords: 'Keywords', citation: 'HOW TO CITE', volume: 'Volume', issue: 'Issue', pages: 'Pages', date: 'Published', id: 'Article ID', pending: 'Not assigned', author: 'Corresponding author' };
  const pageRange = article.page_first != null ? `${article.page_first}${article.page_last != null && article.page_last !== article.page_first ? '\u2013' + article.page_last : ''}` : labels.pending;
  const issueLine = article.issue ? `${labels.volume} ${article.issue.volume}  |  ${labels.issue} ${article.issue.issue_number}  |  ${article.issue.year}` : labels.pending;
  const articleId = `AGM-${article.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://agmjoural.uz').replace(/\/$/, '');
  let page = doc.addPage([width, height]);
  let y = height - 135;
  function header() {
    page.drawText(settings.journal_name.toUpperCase(), { x: margin, y: height - 51, size: fitFont(settings.journal_name.toUpperCase(), fontBold, 23, width - margin * 2), font: fontBold, color: navy });
    page.drawText('RESEARCH PUBLICATION  /  OPEN ACCESS', { x: margin, y: height - 70, size: 8, font: fontRegular, color: teal });
    page.drawLine({ start: { x: margin, y: height - 82 }, end: { x: width - margin, y: height - 82 }, thickness: 1.5, color: teal });
    page.drawText(issueLine, { x: margin, y: height - 103, size: 9, font: fontBold, color: navy });
    page.drawText(`${labels.pages}: ${pageRange}`, { x: margin, y: height - 118, size: 8, font: fontRegular, color: muted });
  }
  header();
  function text(value: string, size = 10, bold = false, color = ink, spacing = 15) {
    const font = bold ? fontBold : fontRegular;
    // Split long unbroken words, URLs and explicit paragraphs before wrapping.
    const lines: string[] = [];
    for (const paragraph of value.split(/\r?\n/)) {
      const tokens = paragraph.split(/\s+/).map(word => {
        let chunks = '', segment = '';
        for (const char of word) {
          if (font.widthOfTextAtSize(segment + char, size) > width - margin * 2) { chunks += segment + ' '; segment = ''; }
          segment += char;
        }
        return chunks + segment;
      }).join(' ');
      lines.push(...wrapText(tokens, width - margin * 2, size, font));
    }
    for (const line of lines) {
      if (y < 80) { page = doc.addPage([width, height]); header(); y = height - 145; }
      page.drawText(line, { x: margin, y, size, font, color });
      y -= spacing;
    }
  }
  text(article.article_type.replace(/_/g, ' ').toUpperCase(), 8, true, teal, 16);
  text(title, 19, true, navy, 26);
  y -= 10;
  const authors = article.authors || [];
  authors.forEach((author, index) => {
    text(`${index + 1}. ${author.full_name}${author.is_corresponding ? ' *' : ''}`, 10, true);
    text([author.affiliation, author.country].filter(Boolean).join(', '), 8.5, false, muted, 13);
    if (author.orcid) text(`ORCID: ${author.orcid}`, 8, false, teal, 12);
  });
  const corresponding = authors.find(author => author.is_corresponding && author.email);
  if (corresponding) text(`* ${labels.author}: ${corresponding.email}`, 8, false, muted);
  y -= 12;
  text(`${labels.id}: ${articleId}   |   ${labels.date}: ${article.publication_date || labels.pending}`, 8, false, muted, 14);
  if (isValidIssn(settings.issn_online)) text(`ISSN: ${settings.issn_online}`, 8, false, muted);
  if (article.doi) text(`DOI: https://doi.org/${article.doi}`, 8, false, teal);
  y -= 18;
  text(labels.abstract, 10, true, teal, 21);
  text(abstract, 10, false, ink, 16);
  y -= 12;
  if (keywords.length) text(`${labels.keywords}: ${keywords.join('; ')}`, 9, false, muted, 14);
  y -= 18;
  text(labels.citation, 9, true, teal, 19);
  const authorNames = authors.map(author => author.full_name).join(', ');
  const year = article.issue?.year || article.publication_date?.slice(0, 4);
  const issueCitation = article.issue ? `, ${article.issue.volume}(${article.issue.issue_number})` : '';
  text(`${authorNames}${year ? ' (' + year + ')' : ''}. ${title}. ${settings.journal_name}${issueCitation}${article.page_first != null ? ', ' + pageRange : ''}.`, 8.5, false, muted, 13);
  text(`${article.license} \u00b7 ${site}/${lang}/article/${article.slug}`, 8, false, muted, 12);
  const pages = doc.getPages();
  pages.forEach((sheet, index) => {
    sheet.drawLine({ start: { x: margin, y: 53 }, end: { x: width - margin, y: 53 }, thickness: 0.5, color: muted });
    sheet.drawText(`${settings.journal_name}  |  ${articleId}`, { x: margin, y: 37, size: fitFont(`${settings.journal_name}  |  ${articleId}`, fontRegular, 7.5, width - margin * 2 - 60), font: fontRegular, color: muted });
    sheet.drawText(`Metadata ${index + 1} / ${pages.length}`, { x: width - margin - 74, y: 37, size: 7.5, font: fontRegular, color: muted });
  });
  doc.setTitle(title); doc.setAuthor(authorNames); doc.setSubject(issueLine); doc.setCreator(settings.journal_name); doc.setKeywords(['AGM_METADATA_ONLY']);
  return doc.save();
}

/** Branded first page used for the published version of a Word manuscript. */
export async function generatePublicationCoverPdf(article: Article, settings: JournalSettings): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const { fontBold, fontRegular } = await embedJournalFonts(doc);
  const W = 595.28, H = 841.89, M = 48;
  const navy = rgb(0.063, 0.169, 0.247), teal = rgb(0.05, 0.38, 0.39);
  const ink = rgb(0.13, 0.17, 0.2), muted = rgb(0.38, 0.43, 0.47), pale = rgb(0.94, 0.97, 0.96);
  const language = article.original_language;
  const title = (language === 'ru' ? article.title_ru : language === 'en' ? article.title_en : article.title_uz)
    || article.title_en || article.title_uz || article.title_ru || 'Research article';
  const abstract = (language === 'ru' ? article.abstract_ru : language === 'en' ? article.abstract_en : article.abstract_uz)
    || article.abstract_en || article.abstract_uz || article.abstract_ru || '';
  const keywords = (language === 'ru' ? article.keywords_ru : language === 'en' ? article.keywords_en : article.keywords_uz)
    || article.keywords_en || article.keywords_uz || article.keywords_ru || [];
  const articleId = `AGM-${article.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  const issue = article.issue ? `VOL. ${article.issue.volume}  /  ISSUE ${article.issue.issue_number}  /  ${article.issue.year}` : 'RESEARCH ARTICLE';
  const pageRange = article.page_first == null ? '—' : `${article.page_first}${article.page_last != null && article.page_last !== article.page_first ? `–${article.page_last}` : ''}`;
  let page = doc.addPage([W, H]);
  let y = H - 252;
  function header() {
    page.drawRectangle({ x: 0, y: H - 188, width: W, height: 188, color: navy });
    page.drawRectangle({ x: 0, y: H - 188, width: 8, height: 188, color: teal });
    page.drawText(settings.journal_name.toUpperCase(), { x: M, y: H - 49, size: fitFont(settings.journal_name.toUpperCase(), fontBold, 18, W - M * 2 - 110), font: fontBold, color: rgb(1, 1, 1) });
    page.drawText(articleId, { x: W - M - 82, y: H - 49, size: 7.5, font: fontBold, color: rgb(0.76, 0.86, 0.85) });
    page.drawText('OPEN ACCESS  ·  JOURNAL ARTICLE', { x: M, y: H - 68, size: 7, font: fontRegular, color: rgb(0.72, 0.86, 0.83) });
    page.drawLine({ start: { x: M, y: H - 83 }, end: { x: W - M, y: H - 83 }, thickness: 0.7, color: rgb(0.35, 0.57, 0.56) });
    page.drawText(issue, { x: M, y: H - 105, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    const published = article.publication_date || article.issue?.publication_date || '';
    page.drawText(`PUBLISHED ${published}  ·  JOURNAL PAGES ${pageRange}`, { x: M, y: H - 123, size: 7, font: fontRegular, color: rgb(0.78, 0.86, 0.86) });
  }
  function newPage() {
    page = doc.addPage([W, H]);
    page.drawText(settings.journal_name.toUpperCase(), { x: M, y: H - 42, size: 10, font: fontBold, color: navy });
    page.drawText(articleId, { x: W - M - 82, y: H - 42, size: 7, font: fontRegular, color: muted });
    page.drawLine({ start: { x: M, y: H - 54 }, end: { x: W - M, y: H - 54 }, thickness: 0.8, color: teal });
    y = H - 88;
  }
  function wrapped(value: string, size: number, font: PDFFont, maxWidth = W - M * 2) {
    return value.split(/\r?\n/).flatMap(paragraph => wrapText(paragraph, maxWidth, size, font));
  }
  header();
  const articleTypeLabel = article.article_type.replace(/_/g, ' ').toUpperCase();
  const articleTypeWidth = fontBold.widthOfTextAtSize(articleTypeLabel, 7);
  page.drawRectangle({ x: M, y: H - 226, width: articleTypeWidth + 16, height: 16, color: pale });
  page.drawRectangle({ x: M, y: H - 226, width: 2, height: 16, color: teal });
  page.drawText(articleTypeLabel, { x: M + 8, y: H - 220, size: 7, font: fontBold, color: teal });
  const titleSize = fitFont(title, fontBold, 25, W - M * 2);
  const titleLines = wrapped(title, Math.min(25, Math.max(18, titleSize)), fontBold);
  for (const line of titleLines) {
    if (y < 90) newPage();
    page.drawText(line, { x: M, y, size: Math.min(25, Math.max(18, titleSize)), font: fontBold, color: navy });
    y -= 32;
  }
  y -= 7;
  page.drawLine({ start: { x: M, y }, end: { x: M + 54, y }, thickness: 2.5, color: teal }); y -= 20;
  page.drawText('AUTHORS & AFFILIATIONS', { x: M, y, size: 7, font: fontBold, color: teal }); y -= 17;
  const authors = [...(article.authors || [])].sort((a, b) => a.order_index - b.order_index);
  for (const [index, author] of authors.entries()) {
    const lines = wrapped(`${String(index + 1).padStart(2, '0')}  ${author.full_name}${author.is_corresponding ? '  *' : ''}`, 10, fontBold);
    for (const line of lines) { if (y < 80) newPage(); page.drawText(line, { x: M, y, size: 10, font: fontBold, color: navy }); y -= 14; }
    const detail = [author.affiliation, author.country].filter(Boolean).join(', ');
    for (const line of wrapped(detail, 8, fontRegular, W - M * 2 - 22)) { if (y < 80) newPage(); page.drawText(line, { x: M + 22, y, size: 8, font: fontRegular, color: muted }); y -= 12; }
    if (author.orcid) { for (const line of wrapped(`ORCID  ${author.orcid}`, 7, fontRegular, W - M * 2 - 22)) { if (y < 80) newPage(); page.drawText(line, { x: M + 22, y, size: 7, font: fontRegular, color: teal }); y -= 11; } }
  }
  const corresponding = authors.find(author => author.is_corresponding && author.email);
  if (corresponding) { for (const line of wrapped(`* Corresponding author: ${corresponding.email}`, 7, fontRegular, W - M * 2 - 22)) { if (y < 80) newPage(); page.drawText(line, { x: M + 22, y, size: 7, font: fontRegular, color: muted }); y -= 11; } y -= 6; }
  if (y < 180) newPage();
  const abstractLines = wrapped(abstract, 9, fontRegular, W - M * 2 - 30);
  let abstractOffset = 0;
  while (abstractOffset < abstractLines.length) {
    let capacity = Math.floor((y - 105) / 13);
    if (capacity < 4) { newPage(); capacity = Math.floor((y - 105) / 13); }
    const lines = abstractLines.slice(abstractOffset, abstractOffset + capacity);
    const cardHeight = lines.length * 13 + 30;
    page.drawRectangle({ x: M, y: y - cardHeight + 4, width: W - M * 2, height: cardHeight, color: pale });
    page.drawRectangle({ x: M, y: y - cardHeight + 4, width: 3, height: cardHeight, color: teal });
    page.drawText(abstractOffset ? 'ABSTRACT  ·  CONTINUED' : 'ABSTRACT', { x: M + 15, y: y - 13, size: 7, font: fontBold, color: teal });
    let abstractY = y - 29;
    for (const line of lines) { page.drawText(line, { x: M + 15, y: abstractY, size: 9, font: fontRegular, color: ink }); abstractY -= 13; }
    y -= cardHeight + 17;
    abstractOffset += lines.length;
    if (abstractOffset < abstractLines.length) newPage();
  }
  if (keywords.length) {
    if (y < 90) newPage();
    page.drawText('KEYWORDS', { x: M, y, size: 7, font: fontBold, color: teal }); y -= 14;
    for (const line of wrapped(keywords.join('  ·  '), 8.5, fontRegular)) { if (y < 75) newPage(); page.drawText(line, { x: M, y, size: 8.5, font: fontRegular, color: ink }); y -= 13; }
  }
  const authorsText = authors.map(author => author.full_name).join(', ');
  const year = article.issue?.year || article.publication_date?.slice(0, 4) || '';
  const cite = `${authorsText}${year ? ` (${year})` : ''}. ${title}. ${settings.journal_name}${article.issue ? `, ${article.issue.volume}(${article.issue.issue_number})` : ''}${article.page_first != null ? `, pp. ${article.page_first}${article.page_last && article.page_last !== article.page_first ? `–${article.page_last}` : ''}` : ''}.`;
  if (y < 110) newPage();
  y -= 7; page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: muted }); y -= 15;
  page.drawText('HOW TO CITE', { x: M, y, size: 7, font: fontBold, color: teal }); y -= 13;
  for (const line of wrapped(cite, 7.5, fontRegular)) { if (y < 67) newPage(); page.drawText(line, { x: M, y, size: 7.5, font: fontRegular, color: ink }); y -= 11; }
  if (article.doi) { if (y < 67) newPage(); page.drawText(`DOI  https://doi.org/${article.doi}`, { x: M, y, size: 7.5, font: fontRegular, color: teal }); y -= 11; }
  if (isValidIssn(settings.issn_online)) { if (y < 67) newPage(); page.drawText(`ISSN  ${settings.issn_online}`, { x: M, y, size: 7, font: fontRegular, color: muted }); }
  doc.getPages().forEach((sheet, index) => {
    sheet.drawLine({ start: { x: M, y: 43 }, end: { x: W - M, y: 43 }, thickness: 0.45, color: muted });
    const footer = `${article.license}  ·  ${siteUrlForPdf(article)}`;
    sheet.drawText(footer, { x: M, y: 28, size: fitFont(footer, fontRegular, 6.5, W - M * 2 - 40), font: fontRegular, color: muted });
    sheet.drawText(`${index + 1} / ${doc.getPageCount()}`, { x: W - M - 30, y: 28, size: 6.5, font: fontRegular, color: muted });
  });
  doc.setTitle(title); doc.setAuthor(authorsText); doc.setSubject(issue); doc.setCreator(settings.journal_name); doc.setLanguage(language); doc.setKeywords(['AGM_METADATA_ONLY']);
  return doc.save();
}

function siteUrlForPdf(article: Article) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://agmjoural.uz').replace(/\/$/, '');
  return `${base}/${article.original_language}/article/${article.slug}`;
}

// 3. MERGE MULTIPLE PDFS
export async function mergePdfs(pdfBuffers: Uint8Array[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const buffer of pdfBuffers) {
    const doc = await PDFDocument.load(buffer);
    const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices());
    copiedPages.forEach(p => mergedPdf.addPage(p));
  }

  return await mergedPdf.save();
}

/** Brand the original page artwork without extracting/reflowing scientific content. */
export async function assemblePublicationPdf(article: Article, settings: JournalSettings, original: Uint8Array): Promise<Uint8Array> {
  const source = await PDFDocument.load(original);
  if (!source.getPageCount()) throw new Error('Empty manuscript');
  const doc = await PDFDocument.create();
  const { fontRegular, fontBold } = await embedJournalFonts(doc);
  const W = 595.28, H = 841.89, M = 32;
  const articleId = `AGM-${article.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  for (let i = 0; i < source.getPageCount(); i++) {
    // Retain the visible crop and rotation, including landscape manuscripts.
    const originalPage = source.getPage(i);
    const crop = originalPage.getCropBox();
    const embedded = await doc.embedPage(originalPage, { left: crop.x, bottom: crop.y, right: crop.x + crop.width, top: crop.y + crop.height });
    const rotation = ((originalPage.getRotation().angle % 360) + 360) % 360;
    const sideways = rotation === 90 || rotation === 270;
    const visibleW = sideways ? embedded.height : embedded.width;
    const visibleH = sideways ? embedded.width : embedded.height;
    const scale = Math.min((W - M * 2) / visibleW, (H - 112) / visibleH);
    const w = visibleW * scale, h = visibleH * scale;
    const x = (W - w) / 2, y = 54 + (H - 112 - h) / 2;
    const page = doc.addPage([W, H]);
    page.drawText(settings.journal_name.toUpperCase(), { x: M, y: H - 29, size: fitFont(settings.journal_name.toUpperCase(), fontBold, 10, W - M * 2 - 100), font: fontBold, color: navy });
    page.drawText(articleId, { x: W - M - 88, y: H - 29, size: 8, font: fontRegular, color: muted });
    const section = subjectLabel(resolveSubjectId(article), 'en') || '';
    page.drawText(section.toUpperCase(), { x: M, y: H - 39, size: 6, font: fontRegular, color: teal });
    page.drawLine({ start: { x: M, y: H - 41 }, end: { x: W - M, y: H - 41 }, thickness: 0.8, color: teal });
    // PDF rotation is clockwise, whereas drawPage angles are counterclockwise.
    const offsets = rotation === 90 ? [0, h] : rotation === 180 ? [w, h] : rotation === 270 ? [w, 0] : [0, 0];
    page.drawPage(embedded, { x: x + offsets[0], y: y + offsets[1], xScale: scale, yScale: scale, rotate: degrees(-rotation) });
    page.drawLine({ start: { x: M, y: 42 }, end: { x: W - M, y: 42 }, thickness: 0.5, color: muted });
    const range = article.page_first != null && article.page_last != null && article.page_last - article.page_first + 1 === source.getPageCount() ? ` | Journal page ${article.page_first + i}` : '';
    page.drawText(`Manuscript ${i + 1} / ${source.getPageCount()}${range}`, { x: M, y: 26, size: 7, font: fontRegular, color: muted });
    page.drawText(`PDF ${i + 1} / ${source.getPageCount()}`, { x: W - M - 65, y: 26, size: 7, font: fontRegular, color: muted });
  }
  doc.setTitle((article.original_language === 'en' ? article.title_en : article.original_language === 'ru' ? article.title_ru : article.title_uz) || article.title_uz);
  doc.setAuthor((article.authors || []).map(a => a.full_name).join(', '));
  doc.setCreator(settings.journal_name); doc.setKeywords(['AGM_FULL_ARTICLE_V2']);
  return doc.save();
}

// Paginated issue contents; page ranges are only printed when assigned.
export async function generateIssueTocPdf(issue: Issue, articles: Article[], journalName = 'AGM Journal', sectionName?: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const { fontBold, fontRegular } = await embedJournalFonts(doc);
  const W = 595.28, H = 841.89, M = 44;
  let page = doc.addPage([W, H]), y = H - 144;
  function header() {
    page.drawText(journalName.toUpperCase(), { x: M, y: H - 51, size: fitFont(journalName.toUpperCase(), fontBold, 23, W - M * 2), font: fontBold, color: navy });
    page.drawText(sectionName ? `CONTENTS / ${sectionName.toUpperCase()}` : 'TABLE OF CONTENTS', { x: M, y: H - 76, size: 10, font: fontBold, color: teal });
    page.drawLine({ start: { x: M, y: H - 89 }, end: { x: W - M, y: H - 89 }, thickness: 1.4, color: teal });
    page.drawText(`Volume ${issue.volume}  \u00b7  Issue ${issue.issue_number}  \u00b7  ${issue.year}`, { x: M, y: H - 111, size: 10, font: fontRegular, color: muted });
  }
  function line(value: string, size: number, bold = false, color = navy) {
    for (const text of wrapText(value, W - M * 2 - 29, size, bold ? fontBold : fontRegular)) {
      if (y < 76) { page = doc.addPage([W, H]); header(); y = H - 144; }
      page.drawText(text, { x: M + 29, y, size, font: bold ? fontBold : fontRegular, color }); y -= size * 1.5;
    }
  }
  header();
  if (!articles.length) line('No articles have been assigned to this issue.', 10, false, muted);
  articles.forEach((article, index) => {
    if (y < 150) { page = doc.addPage([W, H]); header(); y = H - 144; }
    page.drawText(String(index + 1).padStart(2, '0'), { x: M, y, size: 10, font: fontBold, color: teal });
    const title = (article.original_language === 'en' ? article.title_en : article.original_language === 'ru' ? article.title_ru : article.title_uz) || article.title_uz;
    line(title, 11, true);
    line((article.authors || []).map(a => a.full_name).join(', '), 9, false, muted);
    const pages = article.page_first != null ? `Pages ${article.page_first}${article.page_last != null && article.page_last !== article.page_first ? '\u2013' + article.page_last : ''}` : 'Pages not assigned';
    line(pages + (article.doi ? `  \u00b7  DOI: ${article.doi}` : ''), 8, false, teal);
    y -= 17;
  });
  doc.getPages().forEach((sheet, index) => {
    sheet.drawLine({ start: { x: M, y: 53 }, end: { x: W - M, y: 53 }, thickness: 0.5, color: muted });
    const footer = `${journalName}  |  Contents  |  ${index + 1} / ${doc.getPageCount()}`;
    sheet.drawText(footer, { x: M, y: 36, size: fitFont(footer, fontRegular, 8, W - M * 2), font: fontRegular, color: muted });
  });
  doc.setTitle(`Contents \u2014 Volume ${issue.volume}, Issue ${issue.issue_number} (${issue.year})`);
  return doc.save();
}
