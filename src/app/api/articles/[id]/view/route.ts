import { NextRequest, NextResponse } from 'next/server';
import { getArticleById } from '@/lib/db';
import { recordArticleMetric } from '@/lib/article-metrics';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return new NextResponse(null, { status: 403 });
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(id)) return new NextResponse(null, { status: 404 });
  const article = await getArticleById(id);
  if (!article || article.status !== 'published') return new NextResponse(null, { status: 404 });
  await recordArticleMetric(request, id, 'views_count');
  return new NextResponse(null, { status: 204 });
}
