import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { PDFDocument, PDFPage, PDFFont, PDFString, rgb } from 'pdf-lib';
import type { Article, JournalSettings } from '@/types/journal';
import { resolveSubjectId } from '@/lib/subjects';

export const PUBLICATION_DESIGN = 'AGM_ATLAS_1';
export const publicationInk = rgb(0.063, 0.145, 0.20);
export const publicationGold = rgb(0.73, 0.57, 0.32);
export const publicationPaper = rgb(0.993, 0.985, 0.961);

/** Ignore counters/status; refresh a cover when its visible publication record changes. */
export function publicationCoverHash(article: Article, settings: JournalSettings, bodyPages: number) {
  const language = article.original_language;
  const details = {
    design: PUBLICATION_DESIGN, id: article.id, slug: article.slug, language,
    title: article[`title_${language}`] || article.title_en || article.title_uz || article.title_ru,
    abstract: article[`abstract_${language}`] || article.abstract_en || article.abstract_uz || article.abstract_ru,
    keywords: article[`keywords_${language}`] || article.keywords_en || article.keywords_uz || article.keywords_ru,
    authors: [...(article.authors || [])].sort((a, b) => a.order_index - b.order_index).map(author => [author.full_name, author.affiliation, author.country, author.orcid, author.is_corresponding, author.is_corresponding ? author.email : null]),
    type: article.article_type, subject: resolveSubjectId(article), doi: article.doi,
    issue: article.issue ? [article.issue.volume, article.issue.issue_number, article.issue.year] : null,
    date: article.publication_date || article.issue?.publication_date,
    pages: [article.page_first, article.page_first == null ? article.page_last : article.page_first + bodyPages - 1],
    journal: settings.journal_name, issn: settings.issn_online, license: article.license,
    site: process.env.NEXT_PUBLIC_SITE_URL || 'https://agmjoural.uz',
  };
  return createHash('sha256').update(JSON.stringify(details)).digest('hex');
}

export function addPublicationLink(doc: PDFDocument, page: PDFPage, url: string, x: number, y: number, width: number, height: number) {
  if (!/^https?:\/\//i.test(url)) return;
  const annotation = doc.context.obj({ Type: 'Annot', Subtype: 'Link', Rect: [x, y, x + width, y + height], Border: [0, 0, 0], A: { Type: 'Action', S: 'URI', URI: PDFString.of(url) } });
  page.node.addAnnot(doc.context.register(annotation));
}

const accents: Record<string, [number, number, number]> = {
  'natural-sciences': [0.10, 0.43, 0.36],
  'engineering-technology': [0.12, 0.37, 0.58],
  'medicine-life-sciences': [0.12, 0.43, 0.47],
  'economics-business': [0.51, 0.34, 0.16],
  'social-sciences': [0.48, 0.29, 0.40],
  'education-humanities': [0.46, 0.29, 0.22],
  multidisciplinary: [0.28, 0.34, 0.53],
};
export function publicationAccent(article: Article) {
  return rgb(...(accents[resolveSubjectId(article)] || accents.multidisciplinary));
}

let sealBytes: Promise<Uint8Array> | undefined;
export async function embedPublicationSeal(doc: PDFDocument) {
  sealBytes ??= readFile(path.join(process.cwd(), 'public/images/agm-journal-seal.png'))
    .then(bytes => sharp(bytes).resize(280, 280, { fit: 'inside' }).png().toBuffer())
    .catch(error => { sealBytes = undefined; throw error; });
  return doc.embedPng(await sealBytes);
}

/** Decorative identity, not a plot of research results. Stable for a given article. */
export function drawResearchWeave(page: PDFPage, article: Article, x: number, y: number, width: number, height: number) {
  const seed = createHash('sha256').update(`${article.id}:${resolveSubjectId(article)}`).digest();
  for (let row = 0; row < 14; row++) {
    let previous: { x: number; y: number } | undefined;
    for (let column = 0; column <= 38; column++) {
      const t = column / 38;
      const wave = Math.sin(t * Math.PI * 1.7 + row * 0.14 + seed[0] / 100) * height * 0.11;
      const point = { x: x + t * width, y: y + 12 + row * (height - 24) / 14 + wave * Math.sin(t * Math.PI) };
      if (previous) page.drawLine({ start: previous, end: point, thickness: row % 4 === 0 ? 0.7 : 0.35, color: row % 4 === 0 ? publicationGold : rgb(0.50, 0.72, 0.72), opacity: row % 4 === 0 ? 0.7 : 0.32 });
      if (column % 8 === 0 && row % 3 === 0) page.drawCircle({ ...point, size: 1.1, color: publicationGold, opacity: 0.65 });
      previous = point;
    }
  }
}

export function drawBodyIdentity(page: PDFPage, article: Article, journalName: string, fonts: { fontRegular: PDFFont; fontBold: PDFFont }, index: number, total: number) {
  const W = page.getWidth(), H = page.getHeight(), M = 32;
  const accent = publicationAccent(article);
  const id = `AGM-${article.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  const name = journalName.toUpperCase();
  const nameSize = Math.min(9, (W - M * 2 - 145) / Math.max(fonts.fontBold.widthOfTextAtSize(name, 1), 1));
  page.drawRectangle({ x: 0, y: 0, width: 7, height: H, color: accent });
  page.drawRectangle({ x: 7, y: H - 90, width: 2, height: 48, color: publicationGold });
  page.drawText(name, { x: M + 26, y: H - 29, size: nameSize, font: fonts.fontBold, color: publicationInk });
  page.drawText(id, { x: W - M - fonts.fontRegular.widthOfTextAtSize(id, 7), y: H - 29, size: 7, font: fonts.fontRegular, color: accent });
  page.drawLine({ start: { x: M, y: H - 43 }, end: { x: W - M, y: H - 43 }, thickness: 0.65, color: accent });
  page.drawRectangle({ x: M, y: 42, width: 24, height: 2, color: publicationGold });
  page.drawLine({ start: { x: M + 32, y: 43 }, end: { x: W - M, y: 43 }, thickness: 0.4, color: rgb(0.78, 0.81, 0.8) });
  const number = article.page_first == null ? String(index + 1) : String(article.page_first + index);
  page.drawText(`${article.license || 'CC BY 4.0'}  /  ${index + 1} / ${total}`, { x: M, y: 27, size: 6.5, font: fonts.fontRegular, color: rgb(0.39, 0.44, 0.46) });
  page.drawText(number.padStart(2, '0'), { x: W - M - fonts.fontBold.widthOfTextAtSize(number.padStart(2, '0'), 12), y: 25, size: 12, font: fonts.fontBold, color: accent });
}
