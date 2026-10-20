import { NextRequest, NextResponse } from 'next/server';
import { getArticleById, getJournalSettings } from '@/lib/db';
import { publicArticleMetadata } from '@/lib/scholarly-feeds';
import type { Language } from '@/types/journal';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(id)) return new Response(null, { status: 404 });
  try {
    const article = await getArticleById(id);
    if (!article || article.status !== 'published') return new Response(null, { status: 404 });
    const requested = request.nextUrl.searchParams.get('lang');
    const lang: Language = requested === 'uz' || requested === 'ru' || requested === 'en' ? requested : article.original_language;
    return NextResponse.json(publicArticleMetadata(article, await getJournalSettings(), lang), { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  } catch {
    return NextResponse.json({ error: 'Metadata temporarily unavailable' }, { status: 503 });
  }
}
