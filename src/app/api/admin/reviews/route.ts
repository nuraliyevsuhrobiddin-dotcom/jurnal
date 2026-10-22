import { NextRequest, NextResponse, after } from 'next/server';
import { z } from 'zod';
import { adminAccess } from '@/lib/admin-access';
import { createServerClient } from '@/lib/supabase/server';
import { boundedBody } from '@/lib/bounded-body';
import { protectRequest } from '@/lib/request-limit';
import { getArticleById, logAudit } from '@/lib/db';
import { queueNotificationOnce, drainNotificationQueue } from '@/lib/notifications';
import { siteUrl } from '@/lib/site-url';

const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
export async function GET() {
  const denied = await adminAccess(); if (denied) return denied;
  const db = createServerClient(); if (!db) return reply({ error: 'Supabase kerak.' }, 503);
  const [reviews, articles, reviewers] = await Promise.all([
    db.from('review_assignments').select('*').order('created_at', { ascending: false }).limit(500),
    db.from('articles').select('id,title_uz,title_en').in('status', ['draft','under_review','approved']).order('created_at', { ascending: false }).limit(500),
    db.from('staff_accounts').select('id,email').eq('active', true).eq('role', 'reviewer'),
  ]);
  if (reviews.error || articles.error || reviewers.error) return reply({ error: 'Taqriz ma’lumotlari olinmadi. Migration 013 ni tekshiring.' }, 503);
  return reply({ assignments: reviews.data, articles: articles.data.map(a => ({ id: a.id, title: a.title_en || a.title_uz })), reviewers: reviewers.data });
}
export async function POST(request: NextRequest) {
  const denied = await adminAccess(); if (denied) return denied;
  if (request.headers.get('origin') !== request.nextUrl.origin) return reply({ error: 'Invalid origin' }, 403);
  const limited = await protectRequest(request, 'assign-review', 30, 3600); if (limited) return limited;
  try {
    const values = z.object({ article_id: z.string().uuid(), reviewer_id: z.string().uuid(), due_at: z.string().datetime({ offset: true }).refine(s => Date.parse(s) > Date.now() && Date.parse(s) < Date.now() + 366 * 86400000) }).parse(JSON.parse(new TextDecoder().decode(await boundedBody(request, 4096))));
    const db = createServerClient(); if (!db) return reply({ error: 'Supabase kerak.' }, 503);
    const article = await getArticleById(values.article_id);
    if (!article || !['draft','under_review','approved'].includes(article.status)) return reply({ error: 'Faqat nashrdan oldingi maqolani taqrizga berish mumkin.' }, 400);
    const { data: reviewer, error: reviewerError } = await db.from('staff_accounts').select('id,email').eq('id', values.reviewer_id).eq('active', true).eq('role', 'reviewer').single();
    if (reviewerError || !reviewer) return reply({ error: 'Faol taqrizchi hisobini tanlang.' }, 400);
    if (article.authors?.some(a => a.email?.toLowerCase() === reviewer.email.toLowerCase())) return reply({ error: 'Muallif o‘z maqolasiga taqrizchi bo‘la olmaydi.' }, 400);
    const { data, error } = await db.from('review_assignments').insert(values).select('*').single();
    if (error) return reply({ error: 'Topshiriq saqlanmadi. Bu taqrizchi allaqachon biriktirilgan bo‘lishi mumkin.' }, 409);
    await queueNotificationOnce(`review-assigned:${data.id}`, { recipient: reviewer.email, subject: 'AGM Journal — yangi taqriz topshirig‘i', body: `Sizga maqola taqrizi biriktirildi. Muddat: ${new Date(values.due_at).toISOString().slice(0,10)}.\n\nHisobingizga kirib topshiriqni ko‘ring:\n${siteUrl('/reviewer')}\n\nManfaatlar to‘qnashuvi bo‘lsa tahririyatga xabar bering.` });
    await logAudit('review_assigned', 'review_assignment', data.id, { article_id: values.article_id, reviewer_id: values.reviewer_id });
    after(() => drainNotificationQueue(3));
    return reply({ assignment: data });
  } catch { return reply({ error: 'Maqola, taqrizchi va kelajakdagi muddatni tekshiring.' }, 400); }
}
export async function PATCH(request: NextRequest) {
  const denied = await adminAccess(); if (denied) return denied;
  if (request.headers.get('origin') !== request.nextUrl.origin) return reply({ error: 'Invalid origin' }, 403);
  try {
    const values = z.object({ id: z.string().uuid(), action: z.literal('cancel') }).parse(JSON.parse(new TextDecoder().decode(await boundedBody(request, 4096))));
    const db = createServerClient(); if (!db) return reply({ error: 'Supabase kerak.' }, 503);
    const { data, error } = await db.from('review_assignments').update({ status: 'cancelled' }).eq('id', values.id).eq('status', 'assigned').select('id').maybeSingle();
    if (error || !data) return reply({ error: 'Faqat yakunlanmagan topshiriq bekor qilinadi.' }, 409);
    await logAudit('review_cancelled', 'review_assignment', values.id);
    return reply({ success: true });
  } catch { return reply({ error: 'Topshiriqni tekshiring.' }, 400); }
}
