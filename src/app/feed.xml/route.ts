import { NextRequest } from 'next/server';
import { getPublishedArticles, getJournalSettings } from '@/lib/db';
import { rssFeed } from '@/lib/scholarly-feeds';
import type { Language } from '@/types/journal';

export async function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get('lang') || 'en';
  const lang: Language = requested === 'uz' || requested === 'ru' ? requested : 'en';
  try {
    const [articles, settings] = await Promise.all([getPublishedArticles({ limit: 50 }), getJournalSettings()]);
    return new Response(rssFeed(articles, settings, lang), { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'no-store' } });
  } catch {
    return new Response('Feed temporarily unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
