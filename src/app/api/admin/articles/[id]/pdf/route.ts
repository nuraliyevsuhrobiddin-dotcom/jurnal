import { MAX_UPLOAD_BYTES } from '@/lib/upload-limits';
import { NextRequest, NextResponse } from 'next/server';
import { adminAccess } from '@/lib/admin-access';
import { getArticleById, getJournalSettings, updateArticle } from '@/lib/db';
import { assemblePublicationPdf } from '@/lib/pdf/generator';
import { PDFDocument } from 'pdf-lib';
import { manuscriptToPdf, ManuscriptFileError } from '@/lib/pdf/manuscript-conversion';
import { readManuscript, saveManuscript } from '@/lib/manuscript-storage';
import { readArticlePdf, saveArticlePdf } from '@/lib/pdf/storage';
import { streamPdf } from '@/lib/pdf/stream';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminAccess(); if (denied) return denied;
  const { id } = await params;
  const article = await getArticleById(id);
  if (!article) return NextResponse.json({ error: 'Maqola topilmadi' }, { status: 404 });
  if (!article.pdf_url || !article.pdf_file_size) return NextResponse.json({ error: 'To‘liq maqola PDF’i tayyor emas. Maqola faylini tanlab saqlang.' }, { status: 404 });
  const bytes = await readArticlePdf(id);
  if (!bytes) return NextResponse.json({ error: 'To‘liq maqola fayli hali saqlanmagan. Maqola tahririda PDF yoki DOCX faylini tanlab saqlang.' }, { status: 404 });
  return new NextResponse(streamPdf(bytes), { headers: { 'Content-Type': 'application/pdf', 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminAccess(); if (denied) return denied;
  try {
    const { id } = await params;
    const article = await getArticleById(id);
    if (!article) return NextResponse.json({ error: 'Maqola topilmadi' }, { status: 404 });
    const form = await request.formData();
    let file = form.get('file');
    if (!(file instanceof File) && form.get('use_manuscript') === 'true') {
      const manuscriptId = article.manuscript_file_url?.match(/^\/api\/admin\/manuscripts\/([a-f0-9-]{36})$/i)?.[1];
      const stored = manuscriptId ? await readManuscript(manuscriptId) : null;
      if (!stored) return NextResponse.json({ error: 'Yuborilgan qo‘lyozma topilmadi. Faylni qayta tanlang.' }, { status: 404 });
      file = new File([Buffer.from(stored.bytes)], stored.metadata.name, { type: stored.metadata.contentType });
    }
    if (!(file instanceof File) || file.size === 0 || file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: '4 MB gacha to‘liq maqola PDF yoki DOCX faylini tanlang.' }, { status: 400 });
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'pdf' && extension !== 'docx') return NextResponse.json({ error: 'PDF yoki DOCX faylini tanlang.' }, { status: 400 });
    const sourceBytes = new Uint8Array(await file.arrayBuffer());
    const settings = await getJournalSettings();
    const original = await manuscriptToPdf(sourceBytes, extension, settings);
    const pageCount = (await PDFDocument.load(original)).getPageCount();
    const first = article.page_first || 1;
    const prepared = { ...article, page_first: first, page_last: first + pageCount - 1 };
    let merged: Uint8Array;
    try { merged = await assemblePublicationPdf(prepared, settings, original); }
    catch { return NextResponse.json({ error: 'PDF o‘qilmadi. Fayl buzilgan yoki parol bilan himoyalangan.' }, { status: 400 }); }
    await saveArticlePdf(id, merged);
    const stored = form.get('use_manuscript') === 'true' ? null : await saveManuscript(file, sourceBytes, extension);
    await updateArticle(id, { pdf_url: `/api/articles/${id}/pdf`, pdf_file_size: merged.length, page_first: first, page_last: prepared.page_last,
      ...(stored ? { manuscript_file_url: `/api/admin/manuscripts/${stored.id}` } : {}) });
    return NextResponse.json({ success: true, url: `/api/admin/articles/${id}/pdf`, page_count: pageCount, page_first: first, page_last: prepared.page_last });
  } catch (cause) {
    if (cause instanceof ManuscriptFileError) return NextResponse.json({ error: cause.message }, { status: 400 });
    return NextResponse.json({ error: cause instanceof Error ? cause.message : 'PDF saqlanmadi.' }, { status: 500 });
  }
}
