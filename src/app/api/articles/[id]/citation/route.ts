import { NextRequest, NextResponse } from 'next/server';
import { getArticleById, getJournalSettings } from '@/lib/db';
import { exportCitation } from '@/lib/citation-export';
import type { Language } from '@/types/journal';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(id)) return new NextResponse(null, { status: 404 });
  const article = await getArticleById(id);
  if (!article || article.status !== 'published') return new NextResponse(null, { status: 404 });
  const format = request.nextUrl.searchParams.get('format') === 'bib' ? 'bib' : 'ris';
  const requested = request.nextUrl.searchParams.get('lang') || 'en';
  const lang = (['en', 'uz', 'ru'].includes(requested) ? requested : 'en') as Language;
  const settings = await getJournalSettings();
  return new NextResponse(exportCitation(article, settings.journal_name, lang, format), { headers: {
    'Content-Type': format === 'bib' ? 'application/x-bibtex; charset=utf-8' : 'application/x-research-info-systems; charset=utf-8',
    'Content-Disposition': `attachment; filename="agm-${id}.${format}"`, 'Cache-Control': 'no-store',
  } });
}
