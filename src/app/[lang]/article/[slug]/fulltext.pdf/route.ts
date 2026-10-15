import { NextRequest, NextResponse } from 'next/server';
import { getArticleBySlug } from '@/lib/db';
import { GET as servePdf } from '@/app/api/articles/[id]/pdf/route';
import { siteUrl } from '@/lib/site-url';

export async function GET(request: NextRequest, { params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params;
  if (!['en', 'uz', 'ru'].includes(lang)) return new NextResponse(null, { status: 404 });
  const article = await getArticleBySlug(slug);
  if (!article) return new NextResponse(null, { status: 404 });
  const response = await servePdf(request, { params: Promise.resolve({ id: article.id }) });
  if (response.ok) response.headers.set('Link', `<${siteUrl(`/${lang}/article/${slug}`)}>; rel="canonical"`);
  return response;
}
