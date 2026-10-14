import { PDFDocument, PDFFont, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { generateQrPngBuffer } from './qr';
import { Article, Certificate, Issue, JournalSettings } from '@/types/journal';
import { isValidIssn } from '@/lib/identifiers';

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

function wrapText(text: string, maxWidth: number, fontSize: number, font: PDFFont): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// 1. GENERATE AUTHOR CERTIFICATE PDF
export async function generateCertificatePdf(
  cert: Certificate,
  verificationUrl: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // Landscape A4 (841.89 x 595.28 points)
  const width = 841.89;
  const height = 595.28;
  const page = pdfDoc.addPage([width, height]);

  const { fontBold, fontRegular, fontOblique } = await embedJournalFonts(pdfDoc);

  // Palette: Navy & Gold
  const colorNavy = rgb(16 / 255, 43 / 255, 63 / 255); // Ink navy #102b3f
  const colorGold = rgb(128 / 255, 99 / 255, 49 / 255); // Dark gold #806331
  const colorDarkGray = rgb(0.2, 0.25, 0.3);
  const colorLightGray = rgb(0.95, 0.96, 0.98);

  // Outer Background & Elegant Academic Double Border
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: colorLightGray,
  });

  // Inner white card
  page.drawRectangle({
    x: 20,
    y: 20,
    width: width - 40,
    height: height - 40,
    color: rgb(1, 1, 1),
  });

  // Dark Navy outer frame
  page.drawRectangle({
    x: 30,
    y: 30,
    width: width - 60,
    height: height - 60,
    borderColor: colorNavy,
    borderWidth: 3,
  });

  // Gold inner frame
  page.drawRectangle({
    x: 36,
    y: 36,
    width: width - 72,
    height: height - 72,
    borderColor: colorGold,
    borderWidth: 1.5,
  });

  // Certificate Header
  const orgName = "AGM SCIENTIFIC PUBLISHING ACADEMY";
  page.drawText(orgName, {
    x: (width - fontBold.widthOfTextAtSize(orgName, 13)) / 2,
    y: height - 70,
    size: 13,
    font: fontBold,
    color: colorNavy,
  });

  const journalName = "AGM JOURNAL";
  page.drawText(journalName, {
    x: (width - fontBold.widthOfTextAtSize(journalName, 28)) / 2,
    y: height - 105,
    size: 28,
    font: fontBold,
    color: colorNavy,
  });

  const journalSub = "INTERNATIONAL MULTIDISCIPLINARY SCIENTIFIC JOURNAL";
  page.drawText(journalSub, {
    x: (width - fontRegular.widthOfTextAtSize(journalSub, 9)) / 2,
    y: height - 122,
    size: 9,
    font: fontRegular,
    color: colorDarkGray,
  });

  // Certificate Badge / Title
  const titleText = "CERTIFICATE OF PUBLICATION";
  page.drawText(titleText, {
    x: (width - fontBold.widthOfTextAtSize(titleText, 22)) / 2,
    y: height - 165,
    size: 22,
    font: fontBold,
    color: colorGold,
  });

  const certSub = "THIS IS TO CERTIFY THAT THE SCIENTIFIC RESEARCH PAPER HAS BEEN PEER-REVIEWED AND PUBLISHED";
  page.drawText(certSub, {
    x: (width - fontRegular.widthOfTextAtSize(certSub, 8.5)) / 2,
    y: height - 185,
    size: 8.5,
    font: fontRegular,
    color: colorDarkGray,
  });

  // Author Name
  const authorIntro = "Presented to author:";
  page.drawText(authorIntro, {
    x: (width - fontRegular.widthOfTextAtSize(authorIntro, 11)) / 2,
    y: height - 225,
    size: 11,
    font: fontRegular,
    color: colorDarkGray,
  });

  const authorName = cert.author_name;
  page.drawText(authorName, {
    x: (width - fontBold.widthOfTextAtSize(authorName, 24)) / 2,
    y: height - 255,
    size: 24,
    font: fontBold,
    color: colorNavy,
  });

  if (cert.author_affiliation) {
    const affLines = wrapText(cert.author_affiliation, width - 200, 10, fontRegular);
    let affY = height - 275;
    for (const line of affLines.slice(0, 2)) {
      page.drawText(line, {
        x: (width - fontRegular.widthOfTextAtSize(line, 10)) / 2,
        y: affY,
        size: 10,
        font: fontRegular,
        color: colorDarkGray,
      });
      affY -= 14;
    }
  }

  // Article Title
  const paperIntro = "For publishing the original scientific article entitled:";
  page.drawText(paperIntro, {
    x: (width - fontRegular.widthOfTextAtSize(paperIntro, 11)) / 2,
    y: height - 325,
    size: 11,
    font: fontRegular,
    color: colorDarkGray,
  });

  const titleLines = wrapText(`"${cert.article_title}"`, width - 220, 14, fontBold);
  let titleY = height - 350;
  for (const line of titleLines.slice(0, 3)) {
    page.drawText(line, {
      x: (width - fontBold.widthOfTextAtSize(line, 14)) / 2,
      y: titleY,
      size: 14,
      font: fontBold,
      color: colorNavy,
    });
    titleY -= 18;
  }

  // Publication Details
  const issueInfo = `Volume ${cert.issue_volume}, Issue ${cert.issue_number} (${cert.issue_year}) | Publication Date: ${cert.issue_date}`;
  page.drawText(issueInfo, {
    x: (width - fontOblique.widthOfTextAtSize(issueInfo, 11)) / 2,
    y: titleY - 10,
    size: 11,
    font: fontOblique,
    color: colorNavy,
  });

  // Bottom section: QR Code, Cert Number, Signatures
  // Generate & Embed QR Code
  try {
    const qrBuffer = await generateQrPngBuffer(verificationUrl);
    const qrImage = await pdfDoc.embedPng(qrBuffer);
    const qrSize = 80;
    const qrX = 65;
    const qrY = 55;

    page.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });

    const qrLabel = "Scan to verify online";
    page.drawText(qrLabel, {
      x: qrX,
      y: qrY - 12,
      size: 7.5,
      font: fontRegular,
      color: colorDarkGray,
    });
  } catch (err) {
    console.warn("Could not embed QR code to certificate:", err);
  }

  // Center Certificate Metadata
  const certNoText = `Certificate No: ${cert.certificate_number}`;
  page.drawText(certNoText, {
    x: 200,
    y: 95,
    size: 10,
    font: fontBold,
    color: colorNavy,
  });

  const verCodeText = `Verification Code: ${cert.verification_code}`;
  page.drawText(verCodeText, {
    x: 200,
    y: 80,
    size: 9,
    font: fontRegular,
    color: colorDarkGray,
  });

  const verUrlText = `Portal: ${verificationUrl}`;
  page.drawText(verUrlText.substring(0, 65), {
    x: 200,
    y: 65,
    size: 8,
    font: fontRegular,
    color: colorDarkGray,
  });

  // Right Signatures / Stamp
  const signX = width - 240;
  page.drawText("Editor-in-Chief", {
    x: signX,
    y: 115,
    size: 10,
    font: fontBold,
    color: colorNavy,
  });

  page.drawText("Academician Sh. Ayupov", {
    x: signX,
    y: 85,
    size: 10,
    font: fontRegular,
    color: colorDarkGray,
  });

  page.drawLine({
    start: { x: signX, y: 100 },
    end: { x: signX + 160, y: 100 },
    thickness: 1,
    color: colorGold,
  });

  page.drawText("AGM Journal Editorial Board", {
    x: signX,
    y: 70,
    size: 8.5,
    font: fontOblique,
    color: colorDarkGray,
  });

  // Official Journal Blue Seal (Stamp)
  try {
    const sealBuffer = await readFile(path.join(process.cwd(), 'public/images/agm-journal-seal.png'));
    const sealImage = await pdfDoc.embedPng(sealBuffer);
    const sealSize = 94;
    page.drawImage(sealImage, {
      x: signX + 40,
      y: 42,
      width: sealSize,
      height: sealSize,
      opacity: 0.88,
    });
  } catch (err) {
    console.warn("Could not embed official seal into certificate:", err);
  }

  return await pdfDoc.save();
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
    ? { abstract: 'ANNOTATSIYA', keywords: 'Kalit so?zlar', citation: 'IQTIBOS UCHUN', volume: 'Jild', issue: 'Son', pages: 'Sahifalar', date: 'Nashr sanasi', id: 'Maqola ID', pending: 'Belgilanmagan', author: 'Mas?ul muallif' }
    : lang === 'ru'
    ? { abstract: '?????????', keywords: '???????? ?????', citation: '??? ???????????', volume: '???', issue: '??????', pages: '????????', date: '???? ??????????', id: 'ID ??????', pending: '?? ???????', author: '?????????? ?????' }
    : { abstract: 'ABSTRACT', keywords: 'Keywords', citation: 'HOW TO CITE', volume: 'Volume', issue: 'Issue', pages: 'Pages', date: 'Published', id: 'Article ID', pending: 'Not assigned', author: 'Corresponding author' };
  const pageRange = article.page_first != null ? `${article.page_first}${article.page_last != null && article.page_last !== article.page_first ? '?' + article.page_last : ''}` : labels.pending;
  const issueLine = article.issue ? `${labels.volume} ${article.issue.volume}  |  ${labels.issue} ${article.issue.issue_number}  |  ${article.issue.year}` : labels.pending;
  const articleId = `AGM-${article.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://agmjoural.uz').replace(/\/$/, '');
  let page = doc.addPage([width, height]);
  let y = height - 135;
  function header() {
    page.drawText(settings.journal_name.toUpperCase(), { x: margin, y: height - 51, size: 23, font: fontBold, color: navy });
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
  text(`${article.license} ? ${site}/${lang}/article/${article.slug}`, 8, false, muted, 12);
  const pages = doc.getPages();
  pages.forEach((sheet, index) => {
    sheet.drawLine({ start: { x: margin, y: 53 }, end: { x: width - margin, y: 53 }, thickness: 0.5, color: muted });
    sheet.drawText(`${settings.journal_name}  |  ${articleId}`, { x: margin, y: 37, size: 7.5, font: fontRegular, color: muted });
    sheet.drawText(`${index + 1} / ${pages.length}`, { x: width - margin - 40, y: 37, size: 7.5, font: fontRegular, color: muted });
  });
  doc.setTitle(title); doc.setAuthor(authorNames); doc.setSubject(issueLine); doc.setCreator(settings.journal_name);
  return doc.save();
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

// 4. GENERATE ISSUE TABLE OF CONTENTS (TOC)
export async function generateIssueTocPdf(
  issue: Issue,
  articles: Article[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const width = 595.28;
  const height = 841.89;
  const page = pdfDoc.addPage([width, height]);

  const { fontBold, fontRegular } = await embedJournalFonts(pdfDoc);

  const colorNavy = rgb(16 / 255, 43 / 255, 63 / 255);
  const colorGold = rgb(128 / 255, 99 / 255, 49 / 255);

  // Top Title
  page.drawText("AGM JOURNAL", {
    x: 40,
    y: height - 50,
    size: 20,
    font: fontBold,
    color: colorNavy,
  });

  page.drawText(`TABLE OF CONTENTS — VOLUME ${issue.volume}, ISSUE ${issue.issue_number} (${issue.year})`, {
    x: 40,
    y: height - 75,
    size: 11,
    font: fontBold,
    color: colorGold,
  });

  let currentY = height - 120;

  articles.forEach((art, idx) => {
    const title = art.title_uz;
    const authors = (art.authors || []).map(a => a.full_name).join(', ');
    const pages = `pp. ${art.page_first || 1}-${art.page_last || 10}`;

    page.drawText(`${idx + 1}. ${title}`, {
      x: 40,
      y: currentY,
      size: 11,
      font: fontBold,
      color: colorNavy,
    });
    currentY -= 15;

    page.drawText(authors, {
      x: 55,
      y: currentY,
      size: 9.5,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });

    page.drawText(pages, {
      x: width - 100,
      y: currentY,
      size: 9.5,
      font: fontBold,
      color: colorGold,
    });

    currentY -= 25;
  });

  return await pdfDoc.save();
}
