import { MAX_UPLOAD_BYTES } from '@/lib/upload-limits';
import { NextRequest, NextResponse } from 'next/server';
import { adminAccess } from '@/lib/admin-access';
import { getArticleById, getJournalSettings, updateArticle } from '@/lib/db';
import { PDFDocument } from 'pdf-lib';
import { manuscriptToPdf, ManuscriptFileError, publicationBodyPageCount } from '@/lib/pdf/manuscript-conversion';
import { readManuscript, removeManuscript, saveManuscript } from '@/lib/manuscript-storage';
import { readArticlePdf, removeArticlePdf, saveArticlePdf } from '@/lib/pdf/storage';
import { streamPdf } from '@/lib/pdf/stream';
import { readUploadForm, UploadFormError } from '@/lib/upload-form';
import { BodyLimitError } from '@/lib/bounded-body';
import { assemblePublicationPdf, ensurePublicationLayout } from '@/lib/pdf/generator';

export const maxDuration = 60;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminAccess(); if (denied) return denied;
  const { id } = await params;
  const article = await getArticleById(id);
  if (!article) return NextResponse.json({ error: 'Maqola topilmadi' }, { status: 404 });
  if (!article.pdf_url || !article.pdf_file_size) return NextResponse.json({ error: 'To‘liq maqola PDF’i tayyor emas. Maqola faylini tanlab saqlang.' }, { status: 404 });
  const bytes = await readArticlePdf(id);
  if (!bytes) return NextResponse.json({ error: 'To‘liq maqola fayli hali saqlanmagan. Maqola tahririda PDF yoki DOCX faylini tanlab saqlang.' }, { status: 404 });
  const publication = await ensurePublicationLayout(article, await getJournalSettings(), bytes);
  return new NextResponse(streamPdf(publication), { headers: { 'Content-Type': 'application/pdf', 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminAccess(); if (denied) return denied;
  try {
    const { id } = await params;
    const article = await getArticleById(id);
    if (!article) return NextResponse.json({ error: 'Maqola topilmadi' }, { status: 404 });
    if (article.status === 'published') return NextResponse.json({ error: 'Nashrdagi faylni almashtirishdan oldin maqolani qoralama holatida saqlang. So‘ng faylni tekshirib qayta nashr qiling.' }, { status: 409 });
    const form = await readUploadForm(request);
    let file = form.get('file');
    let reusedManuscript = false;
    if (!(file instanceof File) && form.get('use_manuscript') === 'true') {
      const manuscriptId = article.manuscript_file_url?.match(/^\/api\/admin\/manuscripts\/([a-f0-9-]{36})$/i)?.[1];
      const stored = manuscriptId ? await readManuscript(manuscriptId) : null;
      if (!stored) return NextResponse.json({ error: 'Yuborilgan qo‘lyozma topilmadi. Faylni qayta tanlang.' }, { status: 404 });
      file = new File([Buffer.from(stored.bytes)], stored.metadata.name, { type: stored.metadata.contentType });
      reusedManuscript = true;
    }
    if (!(file instanceof File) || file.size === 0 || file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: '4 MB gacha to‘liq maqola PDF yoki DOCX faylini tanlang.' }, { status: 400 });
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'pdf' && extension !== 'docx') return NextResponse.json({ error: 'PDF yoki DOCX faylini tanlang.' }, { status: 400 });
    const sourceBytes = new Uint8Array(await file.arrayBuffer());
    const settings = await getJournalSettings();
    const first = article.page_first || 1;
    const original = await manuscriptToPdf(sourceBytes, extension, settings, { ...article, page_first: first });
    const pageCount = publicationBodyPageCount(await PDFDocument.load(original));
    const prepared = { ...article, page_first: first, page_last: first + pageCount - 1 };
    // Frame source PDFs without reflowing their figures, equations or text.
    // DOCX conversion already applies the journal's cover and body layout.
    const merged = extension === 'pdf' ? await assemblePublicationPdf(prepared, settings, original) : original;
    const stored = reusedManuscript ? null : await saveManuscript(file, sourceBytes, extension);
    let previousPdf: Uint8Array | null = null;
    let pdfWritten = false;
    try {
      previousPdf = await readArticlePdf(id);
      await saveArticlePdf(id, merged); pdfWritten = true;
      const updated = await updateArticle(id, { pdf_url: `/api/articles/${id}/pdf`, pdf_file_size: merged.length, page_first: first, page_last: prepared.page_last,
        ...(stored ? { manuscript_file_url: `/api/admin/manuscripts/${stored.id}` } : {}) });
      if (!updated) throw new Error('Maqola saqlash vaqtida topilmadi. Sahifani yangilang.');
    } catch (cause) {
      if (pdfWritten) {
        try { if (previousPdf) await saveArticlePdf(id, previousPdf); else await removeArticlePdf(id); }
        catch { console.error('Article PDF rollback failed:', id); }
      }
      if (stored) { try { await removeManuscript(stored); } catch { console.error('Unused manuscript cleanup failed:', stored.id); } }
      throw cause;
    }
    return NextResponse.json({ success: true, url: `/api/admin/articles/${id}/pdf`, page_count: pageCount, page_first: first, page_last: prepared.page_last });
  } catch (cause) {
    if (cause instanceof BodyLimitError) return NextResponse.json({ error: 'Fayl hajmi 4 MB dan oshmasligi kerak.' }, { status: 413 });
    if (cause instanceof UploadFormError) return NextResponse.json({ error: cause.message }, { status: 400 });
    if (cause instanceof ManuscriptFileError) return NextResponse.json({ error: cause.message }, { status: 400 });
    return NextResponse.json({ error: cause instanceof Error ? cause.message : 'PDF saqlanmadi.' }, { status: 500 });
  }
}
