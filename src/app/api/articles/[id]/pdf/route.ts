import { NextRequest, NextResponse } from 'next/server';
import { getArticleById } from '@/lib/db';
import { recordArticleMetric } from '@/lib/article-metrics';
import { readArticlePdf } from '@/lib/pdf/storage';
import { siteUrl } from '@/lib/site-url';

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

    const pdfBytes = await readArticlePdf(id);
    if (!pdfBytes) return new NextResponse('Full article PDF is not available. Please contact the editorial office.', { status: 404 });
    await recordArticleMetric(request, id, 'downloads_count');

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${article.slug}.pdf"`,
        'Cache-Control': 'no-store',
        'Link': `<${siteUrl(`/${article.original_language}/article/${article.slug}`)}>; rel="canonical"`,
      },
    });
  } catch (error) {
    console.error('Error generating article PDF:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
