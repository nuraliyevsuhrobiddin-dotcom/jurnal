import { NextRequest, NextResponse } from 'next/server';
import { getArticleById, getJournalSettings } from '@/lib/db';
import { generateArticleTitlePagePdf } from '@/lib/pdf/generator';
import { readArticlePdf } from '@/lib/pdf/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const article = await getArticleById(id);

    if (!article || article.status !== 'published') {
      return new NextResponse('Article not found', { status: 404 });
    }

    const settings = await getJournalSettings();
    const pdfBytes = await readArticlePdf(id) || await generateArticleTitlePagePdf(article, settings);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${article.slug}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error generating article PDF:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
