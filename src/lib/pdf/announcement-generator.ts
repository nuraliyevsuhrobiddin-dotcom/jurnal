import { PDFDocument, rgb } from 'pdf-lib';
import { embedJournalFonts } from './generator';
import { wrapPolicyText } from './policy-generator';
import { generateQrPngBuffer } from './qr';
import { getCallForPapers } from '@/lib/call-for-papers';
import type { JournalSettings, Language } from '@/types/journal';

export async function generateAnnouncementPdf(settings: JournalSettings, lang: Language) {
  const doc = await PDFDocument.create();
  const { fontBold, fontRegular } = await embedJournalFonts(doc);
  const text = getCallForPapers(lang);
  const W = 595.28, H = 841.89, M = 46;
  const navy = rgb(0.063, 0.169, 0.247), teal = rgb(0.06, 0.38, 0.39), muted = rgb(0.35, 0.40, 0.44);
  let page = doc.addPage([W, H]), y = H - 145;
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://agmjoural.uz').replace(/\/$/, '');
  const submit = `${site}/${lang}/submit`;
  function header() {
    page.drawLine({ start: { x: M, y: H - 88 }, end: { x: W - M, y: H - 88 }, thickness: 1.4, color: teal });
    page.drawText(settings.journal_name.toUpperCase(), { x: M, y: H - 46, size: Math.min(24, (W - M * 2) / fontBold.widthOfTextAtSize(settings.journal_name.toUpperCase(), 1)), font: fontBold, color: navy });
    page.drawText('RESEARCH  /  OPEN ACCESS  /  MONTHLY', { x: M, y: H - 69, size: 8, font: fontRegular, color: teal });
  }
  function paragraph(value: string, bold = false, size = 10, color = muted) {
    for (const line of wrapPolicyText(value.replace(/\u2192/g, ' > '), bold ? fontBold : fontRegular, size, W - 2 * M)) {
      if (y < 77) { page = doc.addPage([W, H]); header(); y = H - 124; }
      page.drawText(line, { x: M, y, size, font: bold ? fontBold : fontRegular, color }); y -= size * 1.45;
    }
    y -= 7;
  }
  header();
  paragraph(text.title, true, 23, navy);
  paragraph(text.subtitle, false, 12, teal);
  y -= 5;
  paragraph(text.intro);
  for (const [heading, body] of text.sections) {
    if (y < 136) { page = doc.addPage([W, H]); header(); y = H - 124; }
    paragraph(heading, true, 11, teal); paragraph(body);
  }
  if (y < 180) { page = doc.addPage([W, H]); header(); y = H - 124; }
  paragraph(text.submit, true, 13, navy);
  paragraph(submit, false, 9, teal);
  paragraph(`${text.contact}: ${settings.contact_email}`, false, 9);
  if (settings.contact_phone) paragraph(settings.contact_phone, false, 9);
  if (y < 155) { page = doc.addPage([W, H]); header(); y = H - 124; }
  const qr = await doc.embedPng(await generateQrPngBuffer(submit));
  page.drawImage(qr, { x: W - M - 64, y: y - 72, width: 64, height: 64 });
  doc.getPages().forEach((p, i) => {
    p.drawLine({ start: { x: M, y: 50 }, end: { x: W - M, y: 50 }, thickness: 0.5, color: teal });
    const footer = `${settings.journal_name} · ${site}`;
    p.drawText(footer, { x: M, y: 34, size: Math.min(7, (W - M * 2 - 55) / fontRegular.widthOfTextAtSize(footer, 1)), font: fontRegular, color: muted });
    p.drawText(`${i + 1} / ${doc.getPageCount()}`, { x: W - M - 28, y: 34, size: 7, font: fontRegular, color: muted });
  });
  doc.setTitle(`${settings.journal_name} — ${text.title}`); doc.setAuthor(settings.journal_name);
  return doc.save();
}
