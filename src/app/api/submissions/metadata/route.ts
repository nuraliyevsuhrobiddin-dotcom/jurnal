import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { MAX_UPLOAD_BYTES } from '@/lib/upload-limits';
import { readUploadForm, UploadFormError } from '@/lib/upload-form';
import { BodyLimitError } from '@/lib/bounded-body';
import { isDocxArchive } from '@/lib/docx-validation';
import { extractManuscriptMetadata, metadataReport } from '@/lib/manuscript-metadata';
import { protectRequest } from '@/lib/request-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  const limited = await protectRequest(request, 'submission-metadata', 10);
  if (limited) return limited;
  try {
    const form = await readUploadForm(request);
    const file = form.get('file');
    if (!(file instanceof File) || !/\.docx$/i.test(file.name) || !file.size || file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'Choose a DOCX file up to 4 MB.' }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!isDocxArchive(buffer)) return NextResponse.json({ error: 'Choose a valid, unencrypted Word document.' }, { status: 400 });
    let text: string;
    try { text = (await mammoth.extractRawText({ buffer })).value; }
    catch { return NextResponse.json({ error: 'The Word document could not be read.' }, { status: 400 }); }
    const metadata = extractManuscriptMetadata(text);
    return NextResponse.json({ success: true, metadata, report: metadataReport(metadata) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof BodyLimitError) return NextResponse.json({ error: 'File exceeds 4 MB limit.' }, { status: 413 });
    if (error instanceof UploadFormError) return NextResponse.json({ error: 'Upload a valid multipart form.' }, { status: 400 });
    console.error('Manuscript metadata extraction failed:', error);
    return NextResponse.json({ error: 'Metadata could not be extracted. Complete the fields manually.' }, { status: 500 });
  }
}
