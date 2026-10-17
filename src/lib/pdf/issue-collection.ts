import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { PDFDocument, rgb } from 'pdf-lib';
import type { Article, Issue, JournalSettings } from '@/types/journal';
import { embedJournalFonts, generateIssueTocPdf, wrapPublicationText } from './generator';
import { readArticlePdf } from './storage';
import { createServerClient } from '@/lib/supabase/server';
import { orderIssueArticles } from '@/lib/issues/article-order';
import { subjectCoverSvg } from '@/lib/issues/subject-cover-art';
import { findSubject, subjectCollections, resolveSubjectId } from '@/lib/subjects';
export { orderIssueArticles } from '@/lib/issues/article-order';

const MAX_BYTES = 100 * 1024 * 1024;
export class IssueCollectionError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

/** Stable reading order, with unassigned pages after numbered articles. */

// Covers are read from our public directory or owned storage only. Never fetch arbitrary URLs.
async function coverBytes(source?: string): Promise<Uint8Array | null> {
  if (!source || source === '/images/issue-cover-default.svg') return null;
  if (source.startsWith('/') && !source.startsWith('//')) {
    const root = path.resolve('public');
    const resolved = path.resolve(root, '.' + decodeURIComponent(source));
    if (!resolved.startsWith(root + path.sep) || !/\.(png|jpe?g|webp)$/i.test(resolved)) return null;
    try { const bytes = await readFile(resolved); return bytes.length <= 5 * 1024 * 1024 ? bytes : null; } catch { return null; }
  }
  try {
    const url = new URL(source);
    const storage = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://invalid.local');
    const prefix = '/storage/v1/object/public/journal-covers/';
    if (url.origin !== storage.origin || !url.pathname.startsWith(prefix)) return null;
    const key = decodeURIComponent(url.pathname.slice(prefix.length));
    if (!/^issues\/[a-zA-Z0-9-]+\.(png|jpe?g|webp)$/i.test(key)) return null;
    const client = createServerClient();
    if (!client) return null;
    const { data, error } = await client.storage.from('journal-covers').download(key);
    if (error || !data || data.size > 5 * 1024 * 1024) return null;
    return new Uint8Array(await data.arrayBuffer());
  } catch { return null; }
}

export async function generateIssueCoverPdf(issue: Issue, settings: JournalSettings, imageBytes?: Uint8Array | null) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const { fontBold, fontRegular } = await embedJournalFonts(doc);
  const navy = rgb(.063, .169, .247), teal = rgb(.05, .38, .39), white = rgb(1, 1, 1);
  page.drawRectangle({ x: 0, y: 0, width: 595.28, height: 841.89, color: navy });
  // An uploaded cover is preserved as full artwork, with a separate issue-information footer.
  if (imageBytes) {
    const png = await sharp(imageBytes, { limitInputPixels: 40000000 }).rotate().resize(1600, 2200, { fit: 'inside', withoutEnlargement: true }).png().toBuffer();
    const image = await doc.embedPng(png);
    const scale = Math.min(595.28 / image.width, 755 / image.height);
    const w = image.width * scale, h = image.height * scale;
    page.drawImage(image, { x: (595.28 - w) / 2, y: 86 + (755 - h) / 2, width: w, height: h });
  } else {
    page.drawRectangle({ x: 42, y: 320, width: 511, height: 8, color: teal });
    let y = 722;
    for (const line of wrapPublicationText(settings.journal_name.toUpperCase(), 495, 38, fontBold)) {
      page.drawText(line, { x: 48, y, font: fontBold, size: 38, color: white }); y -= 52;
    }
    y = Math.min(y - 60, 510);
    const title = issue.title_en || issue.title_uz || `Volume ${issue.volume}, Issue ${issue.issue_number}`;
    for (const line of wrapPublicationText(title, 495, 20, fontRegular).slice(0, 6)) {
      page.drawText(line, { x: 48, y, font: fontRegular, size: 20, color: white }); y -= 30;
    }
    page.drawText('COLLECTED RESEARCH ARTICLES', { x: 48, y: 270, font: fontBold, size: 12, color: white });
    for (const [i, line] of wrapPublicationText(settings.publisher || settings.journal_name, 495, 11, fontRegular).slice(0, 3).entries()) {
      page.drawText(line, { x: 48, y: 220 - i * 17, font: fontRegular, size: 11, color: white });
    }
  }
  page.drawText(`VOLUME ${issue.volume}  |  ISSUE ${issue.issue_number}  |  ${issue.year}`, { x: 42, y: 52, size: 12, font: fontBold, color: white });
  page.drawText(`Published: ${issue.publication_date}`, { x: 42, y: 30, size: 10, font: fontRegular, color: white });
  return doc.save();
}

export async function buildIssueCollection(issue: Issue, articles: Article[], settings: JournalSettings,
  readPdf: (id: string) => Promise<Uint8Array | null> = readArticlePdf, subjectId?: string) {
  const subject = findSubject(subjectId);
  if (subjectId && !subject) throw new IssueCollectionError('Unknown subject collection.', 404);
  const published = orderIssueArticles(articles.filter(a => a.status === 'published' && a.issue_id === issue.id && (!subject || resolveSubjectId(a) === subject.id)));
  if (!published.length) throw new IssueCollectionError('This issue has no published articles yet.', 404);
  if (published.length > 150) throw new IssueCollectionError('This issue exceeds the automatic collection limit. Contact the editorial office.', 413);
  const result = await PDFDocument.create();
  const cover = subject ? await sharp(Buffer.from(subjectCoverSvg(subject.id, issue, settings))).png().toBuffer() : await coverBytes(issue.cover_image_url);
  if (!subject && issue.cover_image_url && issue.cover_image_url !== '/images/issue-cover-default.svg' && !cover) {
    throw new IssueCollectionError('The issue cover is unavailable. Upload a JPG, PNG or WebP cover in issue settings, or select the default cover.', 409);
  }
  async function append(bytes: Uint8Array) {
    const doc = await PDFDocument.load(bytes);
    if (result.getPageCount() + doc.getPageCount() > 1500) throw new IssueCollectionError('This issue exceeds the automatic page limit.', 413);
    const pages = await result.copyPages(doc, doc.getPageIndices()); pages.forEach(page => result.addPage(page));
  }
  try { await append(await generateIssueCoverPdf(issue, settings, cover)); }
  catch { throw new IssueCollectionError('The issue cover cannot be read. Upload a valid JPG, PNG or WebP cover in issue settings.', 409); }
  const groups = subject ? [{ subject, articles: published }] : subjectCollections.map(section => ({ subject: section, articles: published.filter(a => resolveSubjectId(a) === section.id) })).filter(group => group.articles.length);
  await append(await generateIssueTocPdf(issue, groups.flatMap(group => group.articles), settings.journal_name, subject?.labels.en));
  let total = 0;
  for (const group of groups) {
    for (const article of group.articles) {
      const bytes = await readPdf(article.id);
      if (!bytes) throw new IssueCollectionError('A published article PDF is missing. The editorial office must restore it before downloading the complete issue.', 409);
      total += bytes.byteLength;
      if (total > MAX_BYTES) throw new IssueCollectionError('This issue exceeds the 100 MB automatic collection limit.', 413);
      try { await append(bytes); } catch (error) {
        if (error instanceof IssueCollectionError) throw error;
        throw new IssueCollectionError('An article PDF cannot be read. Please contact the editorial office.', 409);
      }
    }
  }
  result.setTitle(`${settings.journal_name}${subject ? ' — ' + subject.labels.en : ''} — Volume ${issue.volume}, Issue ${issue.issue_number} (${issue.year})`);
  result.setAuthor(settings.publisher || settings.journal_name);
  result.setSubject('Complete journal issue: cover, table of contents and published articles');
  return result.save();
}
