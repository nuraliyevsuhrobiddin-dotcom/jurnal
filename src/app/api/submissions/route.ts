import { after, NextRequest, NextResponse } from 'next/server';
import { deliverNotification, queueNotification } from '@/lib/notifications';
import { boundedBody, BodyLimitError } from '@/lib/bounded-body';
import { protectRequest } from '@/lib/request-limit';
import { PDFDocument } from 'pdf-lib';
import { createArticle } from '@/lib/db';
import { manuscriptSubmissionSchema } from '@/lib/submission-validation';
import { removeManuscript, saveManuscript } from '@/lib/manuscript-storage';
import { POLICY_VERSION } from '@/types/policies';
import { isDocxArchive } from '@/lib/docx-validation';

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  const limited = await protectRequest(request, 'submission-upload', 10);
  if (limited) return limited;
  const size = Number(request.headers.get('content-length') || 0);
  if (size > 22 * 1024 * 1024) return NextResponse.json({ error: 'File exceeds 20 MB limit' }, { status: 413 });
  try {
    const bytesBody = await boundedBody(request, 22 * 1024 * 1024);
    const form = await new Request(request.url, { method: 'POST', headers: { 'Content-Type': request.headers.get('content-type') || '' }, body: Buffer.from(bytesBody) }).formData();
    const result = manuscriptSubmissionSchema.safeParse(Object.fromEntries(form.entries()));
    if (!result.success) return NextResponse.json({ error: 'Please complete the required metadata and declarations.', details: result.error.flatten() }, { status: 400 });
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0 || file.size > 20 * 1024 * 1024) return NextResponse.json({ error: 'Upload a PDF or DOCX manuscript up to 20 MB.' }, { status: 400 });
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'pdf' && extension !== 'docx') return NextResponse.json({ error: 'Only PDF and DOCX files are accepted.' }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (extension === 'pdf') {
      if (Buffer.from(bytes.slice(0, 5)).toString() !== '%PDF-') return NextResponse.json({ error: 'The file is not a PDF.' }, { status: 400 });
      try { await PDFDocument.load(bytes); } catch { return NextResponse.json({ error: 'Upload a readable PDF without password protection.' }, { status: 400 }); }
    } else if (!isDocxArchive(bytes)) return NextResponse.json({ error: 'The DOCX file is not a valid unencrypted Word document within the size limits.' }, { status: 400 });
    const now = Date.now();
    const emailLimit = await protectRequest(request, 'submission-email', 5, 900, result.data.email.toLowerCase());
    if (emailLimit) return emailLimit;
    const stored = await saveManuscript(file, bytes, extension);
    try {
      const data = result.data;
      const uuid = stored.id;
      const article = await createArticle({
        slug: `submitted-${uuid}`,
        title_uz: data.title, title_en: data.lang === 'en' ? data.title : undefined, title_ru: data.lang === 'ru' ? data.title : undefined,
        abstract_uz: data.abstract, abstract_en: data.lang === 'en' ? data.abstract : undefined, abstract_ru: data.lang === 'ru' ? data.abstract : undefined,
        keywords_uz: data.keywords.split(/[,;]/).map(word => word.trim()).filter(Boolean),
        original_language: data.lang, article_type: 'original_research', status: 'draft', license: 'CC BY 4.0', references_list: [],
        manuscript_file_url: `/api/admin/manuscripts/${uuid}`,
        submission_notes: `Public author submission; policy version ${POLICY_VERSION}; author confirms originality, all-author consent and no simultaneous submission. Received ${new Date(now).toISOString()}.`,
        authors: [{ id: uuid, article_id: '', full_name: data.author_name, email: data.email, affiliation: data.affiliation, country: data.country, is_corresponding: true, order_index: 1 }],
      });
      const reference = `AGM-SUB-${uuid.slice(0, 8).toUpperCase()}`;
      try {
        const notification = await queueNotification({ recipient: data.email, subject: `AGM Journal — ${reference}`, body: `Your manuscript has been received. Receipt does not constitute acceptance for publication.\n\nReference: ${reference}\nTitle: ${data.title}\n\nThe editorial office will contact you after review.` });
        after(async () => { await deliverNotification(notification); });
      } catch (error) { console.error('Submission receipt queue failed:', error); }
      return NextResponse.json({ success: true, submission_id: article.id, reference }, { status: 201 });
    } catch (cause) {
      await removeManuscript(stored);
      throw cause;
    }
  } catch (cause) {
    if (cause instanceof BodyLimitError) return NextResponse.json({ error: 'File exceeds 20 MB limit' }, { status: 413 });
    console.error('Manuscript submission failed:', cause);
    return NextResponse.json({ error: 'The submission could not be saved. Please try again or contact the editorial office.' }, { status: 500 });
  }
}
