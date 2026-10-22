import { NextResponse } from 'next/server';
import { reviewerIdentity } from '@/lib/reviews';
import { createServerClient } from '@/lib/supabase/server';
import { getArticleById } from '@/lib/db';

export async function GET() {
  const identity = await reviewerIdentity();
  if (!identity) return NextResponse.json({ error: 'Email va authenticator bilan kiring.' }, { status: 401 });
  const db = createServerClient(); if (!db) return NextResponse.json({ error: 'Supabase kerak.' }, { status: 503 });
  const { data, error } = await db.from('review_assignments').select('*').eq('reviewer_id', identity.id).neq('status', 'cancelled').order('created_at', { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: 'Topshiriqlar olinmadi.' }, { status: 503 });
  const assignments = await Promise.all(data.map(async item => {
    const article = await getArticleById(item.article_id);
    return { ...item, title: article?.title_en || article?.title_uz || '', abstract: article?.abstract_en || article?.abstract_uz || '', manuscript_available: Boolean(article?.manuscript_file_url) };
  }));
  return NextResponse.json({ assignments }, { headers: { 'Cache-Control': 'private, no-store' } });
}
