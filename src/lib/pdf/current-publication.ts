import { PDFDocument } from 'pdf-lib';
import type { Article, JournalSettings } from '@/types/journal';
import { readManuscript } from '@/lib/manuscript-storage';
import { manuscriptToPdf } from './manuscript-conversion';
import { assemblePublicationPdf, ensurePublicationLayout } from './generator';

const rebuiltPdfs = new Map<string, Uint8Array>();

/**
 * Upgrade older PDF-source publications on delivery. Their stored output has a
 * generated metadata cover, while a saved PDF source contains the same title,
 * abstract and keywords. Rebuild from the original source. DOCX conversion
 * removes repeated metadata before adding its current editorial cover.
 */
export async function prepareCurrentPublicationPdf(article: Article, settings: JournalSettings, bytes: Uint8Array) {
  let pdf: PDFDocument;
  try { pdf = await PDFDocument.load(bytes); }
  catch { return ensurePublicationLayout(article, settings, bytes); }
  const keywords = pdf.getKeywords() || '';
  const manuscriptId = article.manuscript_file_url?.match(/^\/api\/admin\/manuscripts\/([a-f0-9-]{36})$/i)?.[1];
  if (!keywords.includes('AGM_FULL_ARTICLE_V2') || !manuscriptId) return ensurePublicationLayout(article, settings, bytes);

  let manuscript: Awaited<ReturnType<typeof readManuscript>>;
  try { manuscript = await readManuscript(manuscriptId); } catch { return ensurePublicationLayout(article, settings, bytes); }
  if (!manuscript) return ensurePublicationLayout(article, settings, bytes);

  const cacheKey = `${article.id}:${article.updated_at}:${settings.journal_name}:${manuscriptId}`;
  const cached = rebuiltPdfs.get(cacheKey);
  if (cached) {
    rebuiltPdfs.delete(cacheKey);
    rebuiltPdfs.set(cacheKey, cached);
    return cached;
  }
  let rebuilt: Uint8Array;
  try {
    const source = await manuscriptToPdf(manuscript.bytes, manuscript.metadata.extension, settings, article);
    rebuilt = manuscript.metadata.extension === 'pdf'
      ? await assemblePublicationPdf(article, settings, source)
      : source;
  } catch { return ensurePublicationLayout(article, settings, bytes); }
  rebuiltPdfs.set(cacheKey, rebuilt);
  while (rebuiltPdfs.size > 8) rebuiltPdfs.delete(rebuiltPdfs.keys().next().value!);
  return rebuilt;
}
