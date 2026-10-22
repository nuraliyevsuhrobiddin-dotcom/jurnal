import { checkManuscriptLanguage } from '@/lib/manuscript-language';
import { MAX_UPLOAD_BYTES } from '@/lib/upload-limits';
import { adminAccess } from '@/lib/admin-access';
import { NextRequest, NextResponse } from 'next/server';
import { parseDocxFile } from '@/lib/pdf/docx-parser';
import { extractManuscriptMetadata, metadataReport } from '@/lib/manuscript-metadata';
import { isDocxArchive } from '@/lib/docx-validation';
import { readUploadForm, UploadFormError } from '@/lib/upload-form';
import { BodyLimitError } from '@/lib/bounded-body';

export async function POST(request: NextRequest) {
  const denied = await adminAccess();
  if (denied) return denied;
  try {
    const formData = await readUploadForm(request);
    const file = formData.get('file') as File | null;

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Fayl tanlanmagan' }, { status: 400 });
    }

    // Check mime or extension
    if (!file.name.toLowerCase().endsWith('.docx')) {
      return NextResponse.json({
        error: 'Faqat .docx formatidagi fayllar qabul qilinadi'
      }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({
        error: 'Fayl hajmi 4 MB dan oshmasligi kerak'
      }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (!isDocxArchive(buffer)) return NextResponse.json({ error: 'Haqiqiy, parolsiz DOCX faylini tanlang.' }, { status: 400 });

    const parsed = await parseDocxFile(buffer);
    if (!parsed.success) return NextResponse.json({ error: 'DOCX faylini o‘qib bo‘lmadi', warnings: parsed.warnings }, { status: 400 });

    const metadata = extractManuscriptMetadata(parsed.rawText);
    return NextResponse.json({
      metadata,
      report: metadataReport(metadata),
      language: checkManuscriptLanguage(parsed.rawText),
      success: parsed.success,
      fileName: file.name,
      fileSize: file.size,
      wordCount: parsed.wordCount,
      rawText: parsed.rawText,
      extractedTitle: metadata.title,
      extractedAbstract: metadata.abstract,
      extractedKeywords: metadata.keywords?.split(', '),
      extractedReferences: metadata.references,
      htmlPreview: parsed.htmlContent,
      warnings: parsed.warnings,
    });
  } catch (error: unknown) {
    if (error instanceof BodyLimitError) return NextResponse.json({ error: 'Fayl hajmi 4 MB dan oshmasligi kerak.' }, { status: 413 });
    if (error instanceof UploadFormError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: (error instanceof Error ? error.message : null) || 'Faylni o‘qishda xatolik yuz berdi' }, { status: 500 });
  }
}
