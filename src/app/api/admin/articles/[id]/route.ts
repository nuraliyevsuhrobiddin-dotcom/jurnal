import { adminAccess } from '@/lib/admin-access';
import { after, NextRequest, NextResponse } from 'next/server';
import { updateArticle, updateArticleStatus, getArticleById, deleteArticle, getJournalSettings, getPublishedArticles } from '@/lib/db';
import { Article, ArticleStatus } from '@/types/journal';
import { articleSchema, articleUpdateSchema, articleClearFields, authorMetadata } from '@/lib/article-validation';
import { PublicationError, nextAvailableIssuePage } from '@/lib/publication-ready';
import { queueArticleNotifications } from '@/lib/publication-notifications';
import { drainNotificationQueue, mailConfigured } from '@/lib/notifications';
import { ArticleConflictError } from '@/lib/remote-db';
import { readManuscript } from '@/lib/manuscript-storage';
import { saveArticlePdf, readArticlePdf } from '@/lib/pdf/storage';
import { manuscriptToPdf, publicationBodyPageCount } from '@/lib/pdf/manuscript-conversion';
import { assemblePublicationPdf } from '@/lib/pdf/generator';
import { PDFDocument } from 'pdf-lib';
import { JournalSettings } from '@/types/journal';

export const maxDuration = 60;

async function resolvePageConflictAndPublish(
  id: string,
  article: Article,
  settings: JournalSettings,
  changeNote?: string
): Promise<Article | null> {
  if (!article.issue_id) return null;
  const published = await getPublishedArticles({ issueId: article.issue_id });
  const nextFirst = nextAvailableIssuePage(article.issue_id, published, id);
  const manuscriptId = article.manuscript_file_url?.match(/^\/api\/admin\/manuscripts\/([a-f0-9-]{36})$/i)?.[1];
  const stored = manuscriptId ? await readManuscript(manuscriptId) : null;

  if (stored) {
    const sourceBytes = new Uint8Array(stored.bytes);
    const ext = stored.metadata.extension || 'docx';
    const original = await manuscriptToPdf(sourceBytes, ext, settings, { ...article, page_first: nextFirst });
    const pageCount = publicationBodyPageCount(await PDFDocument.load(original));
    const prepared = { ...article, page_first: nextFirst, page_last: nextFirst + pageCount - 1 };
    const merged = ext === 'pdf' ? await assemblePublicationPdf(prepared, settings, original) : original;
    const savedPath = await saveArticlePdf(id, merged);
    await updateArticle(id, {
      pdf_url: `/api/articles/${id}/pdf`,
      pdf_file_size: merged.length,
      page_first: nextFirst,
      page_last: prepared.page_last,
      pdf_storage_path: savedPath,
      change_note: changeNote || `Sahifalar avtomatik tartiblandi (${nextFirst}–${prepared.page_last})`,
    });
    return updateArticleStatus(id, 'published');
  }

  const pdfBytes = await readArticlePdf(id);
  if (pdfBytes) {
    const originalDoc = await PDFDocument.load(pdfBytes);
    const pageCount = publicationBodyPageCount(originalDoc);
    const prepared = { ...article, page_first: nextFirst, page_last: nextFirst + pageCount - 1 };
    const reassembled = await assemblePublicationPdf(prepared, settings, pdfBytes);
    const savedPath = await saveArticlePdf(id, reassembled);
    await updateArticle(id, {
      pdf_url: `/api/articles/${id}/pdf`,
      pdf_file_size: reassembled.length,
      page_first: nextFirst,
      page_last: prepared.page_last,
      pdf_storage_path: savedPath,
      change_note: changeNote || `Sahifalar avtomatik tartiblandi (${nextFirst}–${prepared.page_last})`,
    });
    return updateArticleStatus(id, 'published');
  }

  return null;
}

async function savedArticleResponse(previous: Article, updated: Article) {
  try {
    await queueArticleNotifications(previous, updated);
    // Retry due pending mail even when the event was already queued on a prior save.
    // The worker preserves sent/unknown statuses and backoff, so saves cannot duplicate mail.
    if (mailConfigured()) after(async () => { await drainNotificationQueue(30, 30000); });
    return NextResponse.json({ ...updated, ...(!mailConfigured() ? { notification_warning: 'Maqola saqlandi. Email xizmati sozlanmagan; xatlar navbatda. Admin → Integratsiyalar bo‘limini tekshiring.' } : {}) });
  } catch {
    // The article is already saved: do not report a false save failure or repeat its transition.
    return NextResponse.json({ ...updated, notification_warning: 'Maqola saqlandi, lekin holat emailini navbatga qo‘shib bo‘lmadi. Muallifga alohida xabar bering.' });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await adminAccess();
  if (denied) return denied;
  const { id } = await params;
  const article = await getArticleById(id);
  if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(article);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await adminAccess();
  if (denied) return denied;
  try {
    const { id } = await params;
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid article data' }, { status: 400 });

    if (body.action === 'change_status' && body.status) {
      const validStatuses: ArticleStatus[] = [
        'draft', 'under_review', 'approved', 'published', 'rejected', 'withdrawn', 'archived'
      ];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }

      if (body.retraction_reason !== undefined && typeof body.retraction_reason !== 'string') return NextResponse.json({ error: 'Invalid reason' }, { status: 400 });
      const previous = await getArticleById(id);
      if (!previous) return NextResponse.json({ error: 'Article not found' }, { status: 404 });
      let updated: Article | null = null;
      try {
        updated = await updateArticleStatus(id, body.status, body.retraction_reason);
      } catch (err) {
        if (body.status === 'published' && err instanceof PublicationError && err.message.includes('sahifalari boshqa maqolaga ajratilgan') && previous.issue_id) {
          const settings = await getJournalSettings();
          updated = await resolvePageConflictAndPublish(id, previous, settings);
          if (!updated) throw err;
        } else {
          throw err;
        }
      }
      if (!updated) return NextResponse.json({ error: 'Article not found' }, { status: 404 });
      return savedArticleResponse(previous, updated);
    }

    const current = await getArticleById(id);
    if (!current) return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    const { clear_fields, ...payload } = body;
    const parsed = articleUpdateSchema.safeParse(payload);
    const cleared = articleClearFields.safeParse(clear_fields);
    if (!parsed.success || !cleared.success) return NextResponse.json({ error: 'Invalid article data', fields: !parsed.success ? parsed.error.flatten() : undefined }, { status: 400 });
    const updates = Object.fromEntries(Object.entries(parsed.data).filter(([key]) => Object.hasOwn(payload, key))) as Partial<Article>;
    for (const key of cleared.data) Object.assign(updates, { [key]: undefined });
    const candidate = { ...current, ...updates };
    const manuscriptFields: (keyof Article)[] = [
      'title_uz', 'title_en', 'title_ru', 'abstract_uz', 'abstract_en', 'abstract_ru',
      'keywords_uz', 'keywords_en', 'keywords_ru', 'authors', 'original_language',
    ];
    const manuscriptChanged = manuscriptFields.some(field => {
      const before = current[field], after = candidate[field];
      if (field === 'authors') return JSON.stringify(authorMetadata(current.authors)) !== JSON.stringify(authorMetadata(candidate.authors));
      if (field.startsWith('keywords_')) return JSON.stringify(before || []) !== JSON.stringify(after || []);
      if (field === 'original_language') return before !== after;
      return String(before ?? '') !== String(after ?? '');
    });
    if (manuscriptChanged && current.pdf_url) {
      // The PDF body is the source of visible manuscript metadata. Require a new
      // source file before this edited record can be published again.
      updates.status = 'draft';
      updates.pdf_url = undefined;
      updates.pdf_file_size = undefined;
      updates.pdf_storage_path = undefined;
      updates.change_note ||= 'Maqola metadata yangilandi; yangi PDF kutilmoqda';
      Object.assign(candidate, updates);
    }
    if (candidate.status === 'published' && !candidate.publication_date) {
      candidate.publication_date = current.publication_date || new Date().toISOString().slice(0, 10);
      updates.publication_date = candidate.publication_date;
    }
    const complete = articleSchema.safeParse(candidate);
    if (!complete.success) return NextResponse.json({ error: 'Invalid article data', fields: complete.error.flatten() }, { status: 400 });
    let updated: Article | null = null;
    try {
      updated = await updateArticle(id, updates);
    } catch (err) {
      if ((updates.status || candidate.status) === 'published' && err instanceof PublicationError && err.message.includes('sahifalari boshqa maqolaga ajratilgan') && candidate.issue_id) {
        const settings = await getJournalSettings();
        updated = await resolvePageConflictAndPublish(id, candidate, settings, updates.change_note);
        if (!updated) throw err;
      } else {
        throw err;
      }
    }
    if (!updated) return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    return savedArticleResponse(current, updated);
  } catch (error: unknown) {
    if (error instanceof ArticleConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof PublicationError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: (error instanceof Error ? error.message : null) || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await adminAccess();
  if (denied) return denied;
  try {
    const { id } = await params;
    const deleted = await deleteArticle(id);
    if (!deleted) return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : null) || 'Server error' }, { status: 500 });
  }
}
