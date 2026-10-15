import { MAX_UPLOAD_BYTES } from '@/lib/upload-limits';
import { NextRequest, NextResponse } from 'next/server';
import { adminAccess } from '@/lib/admin-access';
import { getArticleById, getJournalSettings, updateArticle } from '@/lib/db';
import { generateArticleTitlePagePdf, assemblePublicationPdf } from '@/lib/pdf/generator';
import { readArticlePdf, saveArticlePdf } from '@/lib/pdf/storage';
import { streamPdf } from '@/lib/pdf/stream';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminAccess(); if (denied) return denied;
  const { id } = await params;
  const article = await getArticleById(id);
  if (!article) return NextResponse.json({ error: 'Maqola topilmadi' }, { status: 404 });
  const bytes = await readArticlePdf(id) || await generateArticleTitlePagePdf(article, await getJournalSettings());
  return new NextResponse(streamPdf(bytes), { headers: { 'Content-Type': 'application/pdf', 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminAccess(); if (denied) return denied;
  try {
    const { id } = await params;
    const article = await getArticleById(id);
    if (!article) return NextResponse.json({ error: 'Maqola topilmadi' }, { status: 404 });
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.pdf') || file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: '4 MB gacha PDF faylini tanlang.' }, { status: 400 });
    }
    const original = new Uint8Array(await file.arrayBuffer());
    if (Buffer.from(original.slice(0, 5)).toString() !== '%PDF-') return NextResponse.json({ error: 'Fayl PDF formatida emas.' }, { status: 400 });
    const settings = await getJournalSettings();
    let merged: Uint8Array;
    try { merged = await assemblePublicationPdf(article, settings, original); }
    catch { return NextResponse.json({ error: 'PDF o‘qilmadi. Fayl buzilgan yoki parol bilan himoyalangan.' }, { status: 400 }); }
    await saveArticlePdf(id, merged);
    await updateArticle(id, { pdf_url: `/api/articles/${id}/pdf`, pdf_file_size: merged.length });
    return NextResponse.json({ success: true, url: `/api/admin/articles/${id}/pdf` });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : 'PDF saqlanmadi.' }, { status: 500 });
  }
}
