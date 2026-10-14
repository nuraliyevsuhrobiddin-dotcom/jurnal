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
  const pdfDoc = await PDFDocument.create();
  const width = 595.28; // Portrait A4
  const height = 841.89;
  const page = pdfDoc.addPage([width, height]);

  const { fontBold, fontRegular, fontOblique } = await embedJournalFonts(pdfDoc);

  const colorNavy = rgb(16 / 255, 43 / 255, 63 / 255);
  const colorGold = rgb(128 / 255, 99 / 255, 49 / 255);
  const colorDark = rgb(0.1, 0.1, 0.1);
  const colorMuted = rgb(0.4, 0.45, 0.5);

  // Journal Top Bar
  page.drawRectangle({
    x: 0,
    y: height - 60,
    width,
    height: 60,
    color: colorNavy,
  });

  page.drawText(settings.journal_name.toUpperCase(), {
    x: 40,
    y: height - 38,
    size: 16,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText(`${isValidIssn(settings.issn_online) ? `ISSN: ${settings.issn_online}` : 'ISSN: not verified'} | Open Access Journal`, {
    x: 40,
    y: height - 52,
    size: 9,
    font: fontRegular,
    color: rgb(0.85, 0.9, 0.95),
  });

  let currentY = height - 90;

  // Article Type Badge
  const typeText = article.article_type.replace('_', ' ').toUpperCase();
  page.drawText(typeText, {
    x: 40,
    y: currentY,
    size: 9,
    font: fontBold,
    color: colorGold,
  });

  currentY -= 25;

  // Title (English or Primary)
  const mainTitle = article.title_en || article.title_uz;
  const titleLines = wrapText(mainTitle, width - 80, 16, fontBold);
  for (const line of titleLines) {
    page.drawText(line, {
      x: 40,
      y: currentY,
      size: 16,
      font: fontBold,
      color: colorNavy,
    });
    currentY -= 20;
  }

  // Authors
  currentY -= 10;
  const authorNames = (article.authors || []).map(a => a.full_name).join(', ') || 'Scholarly Authors';
  const authorLines = wrapText(authorNames, width - 80, 11, fontBold);
  for (const line of authorLines) {
    page.drawText(line, {
      x: 40,
      y: currentY,
      size: 11,
      font: fontBold,
      color: colorDark,
    });
    currentY -= 15;
  }

  // Affiliations
  currentY -= 5;
  const affiliations = (article.authors || [])
    .map((a, idx) => `${idx + 1} ${a.affiliation}, ${a.country}`)
    .join('; ');
  const affLines = wrapText(affiliations, width - 80, 9, fontRegular);
  for (const line of affLines.slice(0, 3)) {
    page.drawText(line, {
      x: 40,
      y: currentY,
      size: 9,
      font: fontRegular,
      color: colorMuted,
    });
    currentY -= 13;
  }

  // Divider
  currentY -= 10;
  page.drawLine({
    start: { x: 40, y: currentY },
    end: { x: width - 40, y: currentY },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  });
  currentY -= 20;

  // Abstract Section
  page.drawText("ABSTRACT", {
    x: 40,
    y: currentY,
    size: 11,
    font: fontBold,
    color: colorNavy,
  });
  currentY -= 16;

  const abstractText = article.abstract_en || article.abstract_uz;
  const abstractLines = wrapText(abstractText, width - 80, 9.5, fontRegular);
  for (const line of abstractLines.slice(0, 14)) {
    page.drawText(line, {
      x: 40,
      y: currentY,
      size: 9.5,
      font: fontRegular,
      color: colorDark,
    });
    currentY -= 14;
  }

  // Keywords
  currentY -= 10;
  const keywords = (article.keywords_en && article.keywords_en.length > 0)
    ? article.keywords_en.join(', ')
    : article.keywords_uz.join(', ');
  page.drawText(`Keywords: ${keywords}`, {
    x: 40,
    y: currentY,
    size: 9,
    font: fontOblique,
    color: colorNavy,
  });

  // Citation & Meta Box at Bottom
  page.drawRectangle({
    x: 40,
    y: 50,
    width: width - 80,
    height: 80,
    color: rgb(0.96, 0.97, 0.99),
    borderColor: rgb(0.85, 0.88, 0.92),
    borderWidth: 1,
  });

  page.drawText("PUBLICATION CITATION", {
    x: 55,
    y: 112,
    size: 8.5,
    font: fontBold,
    color: colorNavy,
  });

  const vol = article.issue?.volume || 1;
  const iss = article.issue?.issue_number || 1;
  const yr = article.issue?.year || 2026;
  const citeStr = `${authorNames} (${yr}). ${mainTitle}. AGM Journal, ${vol}(${iss}), ${article.page_first || 1}-${article.page_last || 10}.`;

  const citeLines = wrapText(citeStr, width - 110, 8, fontRegular);
  let citeY = 98;
  for (const line of citeLines.slice(0, 2)) {
    page.drawText(line, {
      x: 55,
      y: citeY,
      size: 8,
      font: fontRegular,
      color: colorDark,
    });
    citeY -= 11;
  }

  if (article.doi) {
    page.drawText(`DOI: https://doi.org/${article.doi}`, {
      x: 55,
      y: 65,
      size: 8,
      font: fontBold,
      color: colorGold,
    });
  }

  return await pdfDoc.save();
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
