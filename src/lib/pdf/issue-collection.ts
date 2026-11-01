import { PDFDocument, rgb } from 'pdf-lib';
import sharp from 'sharp';
import type { Article, Issue, JournalSettings, Language } from '@/types/journal';
import { embedJournalFonts, generateIssueTocPdf, wrapPublicationText } from './generator';
import { orderIssueArticles } from '@/lib/issues/article-order';
import { prepareCurrentPublicationPdf } from './current-publication';
import { readArticlePdf } from './storage';
import { findSubject, resolveSubjectId } from '@/lib/subjects';
import { subjectCoverSvg } from '@/lib/issues/subject-cover-art';
import { createServerClient } from '@/lib/supabase/server';

export { orderIssueArticles };

const MAX_BYTES = 100 * 1024 * 1024;

export class IssueCollectionError extends Error {
  constructor(message: string, readonly status = 500) { super(message); }
}

// Covers are read from our public directory or owned storage only. Never fetch arbitrary URLs.
async function coverBytes(source?: string): Promise<Uint8Array | null> {
  if (!source || source === '/images/issue-cover-default.svg') return null;
  const match = source.match(/\/storage\/v1\/object\/public\/journal-covers\/([^?#]+)/);
  if (!match) return null;
  const key = decodeURIComponent(match[1]);
  if (!/^issues\/[a-f0-9-]{36}\.(?:jpg|jpeg|png|webp)$/i.test(key)) return null;
  const client = createServerClient();
  if (!client) return null;
  try {
    const { data, error } = await client.storage.from('journal-covers').download(key);
    if (error || !data || data.size > 5 * 1024 * 1024) return null;
    return new Uint8Array(await data.arrayBuffer());
  } catch { return null; }
}

export async function generateIssueCoverPdf(
  issue: Issue,
  settings: JournalSettings,
  imageBytes?: Uint8Array | null,
  lang: Language = 'uz'
) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const { fontBold, fontRegular } = await embedJournalFonts(doc);
  const navy = rgb(.063, .169, .247), teal = rgb(.05, .38, .39), white = rgb(1, 1, 1);
  page.drawRectangle({ x: 0, y: 0, width: 595.28, height: 841.89, color: navy });

  const i18n = {
    uz: {
      subtitle: 'ILMIY MAQOLALAR TO‘PLAMI',
      issueLine: (v: number, n: number, y: number) => `JILD ${v}  |  SON ${n}  |  ${y}-YIL`,
      published: (date?: string) => `Nashr sanasi: ${date || '—'}`,
      title: issue.title_uz || issue.title_en || issue.title_ru || `${issue.volume}-jild, ${issue.issue_number}-son (${issue.year})`,
    },
    ru: {
      subtitle: 'СБОРНИК НАУЧНЫХ СТАТЕЙ',
      issueLine: (v: number, n: number, y: number) => `ТОМ ${v}  |  ВЫПУСК ${n}  |  ${y}`,
      published: (date?: string) => `Дата публикации: ${date || '—'}`,
      title: issue.title_ru || issue.title_uz || issue.title_en || `Том ${issue.volume}, Выпуск ${issue.issue_number} (${issue.year})`,
    },
    en: {
      subtitle: 'COLLECTED RESEARCH ARTICLES',
      issueLine: (v: number, n: number, y: number) => `VOLUME ${v}  |  ISSUE ${n}  |  ${y}`,
      published: (date?: string) => `Published: ${date || '—'}`,
      title: issue.title_en || issue.title_uz || issue.title_ru || `Volume ${issue.volume}, Issue ${issue.issue_number} (${issue.year})`,
    },
  }[lang] || {
    subtitle: 'ILMIY MAQOLALAR TO‘PLAMI',
    issueLine: (v: number, n: number, y: number) => `JILD ${v}  |  SON ${n}  |  ${y}-YIL`,
    published: (date?: string) => `Nashr sanasi: ${date || '—'}`,
    title: issue.title_uz || issue.title_en || issue.title_ru || `${issue.volume}-jild, ${issue.issue_number}-son (${issue.year})`,
  };

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
    const title = i18n.title;
    for (const line of wrapPublicationText(title, 495, 20, fontRegular).slice(0, 6)) {
      page.drawText(line, { x: 48, y, font: fontRegular, size: 20, color: white }); y -= 30;
    }
    page.drawText(i18n.subtitle, { x: 48, y: 270, font: fontBold, size: 12, color: white });
    for (const [i, line] of wrapPublicationText(settings.publisher || settings.journal_name, 495, 11, fontRegular).slice(0, 3).entries()) {
      page.drawText(line, { x: 48, y: 220 - i * 17, font: fontRegular, size: 11, color: white });
    }
  }
  page.drawText(i18n.issueLine(issue.volume, issue.issue_number, issue.year), { x: 42, y: 52, size: 12, font: fontBold, color: white });
  page.drawText(i18n.published(issue.publication_date), { x: 42, y: 30, size: 10, font: fontRegular, color: white });
  return doc.save();
}

export async function buildIssueCollection(
  issue: Issue,
  articles: Article[],
  settings: JournalSettings,
  readPdf: (id: string) => Promise<Uint8Array | null> = readArticlePdf,
  subjectId?: string,
  lang: Language = 'uz'
) {
  const subject = findSubject(subjectId);
  if (subjectId && !subject) throw new IssueCollectionError('Unknown subject collection.', 404);
  const published = orderIssueArticles(articles.filter(a => a.status === 'published' && a.issue_id === issue.id && (!subject || resolveSubjectId(a) === subject.id)));
  if (!published.length) throw new IssueCollectionError('This issue has no published articles yet.', 404);
  if (published.length > 150) throw new IssueCollectionError('This issue exceeds the automatic collection limit. Contact the editorial office.', 413);
  const result = await PDFDocument.create();
  const cover = subject ? await sharp(Buffer.from(subjectCoverSvg(subject.id, issue, settings, lang))).png().toBuffer() : await coverBytes(issue.cover_image_url);
  if (!subject && issue.cover_image_url && issue.cover_image_url !== '/images/issue-cover-default.svg' && !cover) {
    throw new IssueCollectionError('The issue cover is unavailable. Upload a JPG, PNG or WebP cover in issue settings, or select the default cover.', 409);
  }
  async function append(bytes: Uint8Array) {
    const doc = await PDFDocument.load(bytes);
    if (result.getPageCount() + doc.getPageCount() > 1500) throw new IssueCollectionError('This issue exceeds the automatic page limit.', 413);
    const pages = await result.copyPages(doc, doc.getPageIndices()); pages.forEach(page => result.addPage(page));
  }
  try { await append(await generateIssueCoverPdf(issue, settings, cover, lang)); }
  catch { throw new IssueCollectionError('The issue cover cannot be read. Upload a valid JPG, PNG or WebP cover in issue settings.', 409); }
  // A complete issue follows its assigned page sequence across subjects. Grouping
  // the articles by subject here can move later pages ahead of earlier ones.
  await append(await generateIssueTocPdf(issue, published, settings.journal_name, subject ? subject.labels[lang] : undefined, lang));
  let total = 0;
  // `published` is already page ordered and subject-filtered when requested.
  for (const article of published) {
    const bytes = await readPdf(article.id);
    if (!bytes) throw new IssueCollectionError('A published article PDF is missing. The editorial office must restore it before downloading the complete issue.', 409);
    total += bytes.byteLength;
    if (total > MAX_BYTES) throw new IssueCollectionError('This issue exceeds the 100 MB automatic collection limit.', 413);
    try { await append(await prepareCurrentPublicationPdf(article, settings, bytes)); } catch (error) {
      if (error instanceof IssueCollectionError) throw error;
      throw new IssueCollectionError('An article PDF cannot be read. Please contact the editorial office.', 409);
    }
  }
  const subjectLabel = subject ? (lang === 'en' ? subject.labels.en : `${subject.labels[lang] || subject.labels.uz} (${subject.labels.en})`) : '';
  const subjectTitle = subjectLabel ? ` — ${subjectLabel}` : '';
  result.setTitle(`${settings.journal_name}${subjectTitle} — Volume ${issue.volume}, Issue ${issue.issue_number} (${issue.year})`);
  result.setAuthor(settings.publisher || settings.journal_name);
  result.setSubject('Complete journal issue: cover, table of contents and published articles');
  return result.save();
}
