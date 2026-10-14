import { adminAccess } from '@/lib/admin-access';
import { NextRequest, NextResponse } from 'next/server';
import { parseDocxFile } from '@/lib/pdf/docx-parser';

export async function POST(request: NextRequest) {
  const denied = await adminAccess();
  if (denied) return denied;
  try {
    const formData = await request.formData();
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

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({
        error: 'Fayl hajmi 20 MB dan oshmasligi kerak'
      }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parsed = await parseDocxFile(buffer);
    if (!parsed.success) return NextResponse.json({ error: 'DOCX faylini o‘qib bo‘lmadi', warnings: parsed.warnings }, { status: 400 });

    return NextResponse.json({
      success: parsed.success,
      fileName: file.name,
      fileSize: file.size,
      wordCount: parsed.wordCount,
      rawText: parsed.rawText,
      extractedTitle: parsed.extractedTitle,
      extractedAbstract: parsed.extractedAbstract,
      extractedKeywords: parsed.extractedKeywords,
      extractedReferences: parsed.extractedReferences,
      htmlPreview: parsed.htmlContent,
      warnings: parsed.warnings,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : null) || 'Faylni o‘qishda xatolik yuz berdi' }, { status: 500 });
  }
}
