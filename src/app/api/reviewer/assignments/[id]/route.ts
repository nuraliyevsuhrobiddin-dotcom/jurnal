import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { reviewerIdentity, assignedReview } from '@/lib/reviews';
import { createServerClient } from '@/lib/supabase/server';
import { boundedBody } from '@/lib/bounded-body';
import { protectRequest } from '@/lib/request-limit';
import { logAudit } from '@/lib/db';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  const identity = await reviewerIdentity(); if (!identity) return NextResponse.json({ error: 'Hisobga kiring.' }, { status: 401 });
  const limited = await protectRequest(request, 'review-submit', 30, 3600, identity.id); if (limited) return limited;
  try {
    const id = z.string().uuid().parse((await context.params).id);
    const values = z.object({ recommendation: z.enum(['accept','minor_revision','major_revision','reject']), author_comments: z.string().trim().min(20).max(20000), confidential_comments: z.string().trim().max(20000).default('') }).parse(JSON.parse(new TextDecoder().decode(await boundedBody(request, 150000))));
    const assignment = await assignedReview(id, identity.id);
    if (!assignment || assignment.status !== 'assigned') return NextResponse.json({ error: 'Topshiriq topilmadi yoki allaqachon topshirilgan.' }, { status: 409 });
    const db = createServerClient()!;
    const { data, error } = await db.from('review_assignments').update({ ...values, status: 'submitted', submitted_at: new Date().toISOString() }).eq('id', id).eq('reviewer_id', identity.id).eq('status', 'assigned').select('id').maybeSingle();
    if (error || !data) return NextResponse.json({ error: 'Taqriz saqlanmadi yoki oldin topshirilgan.' }, { status: 409 });
    await logAudit('review_submitted', 'review_assignment', id, { recommendation: values.recommendation }, identity.email);
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'Taqriz maydonlarini tekshiring.' }, { status: 400 }); }
}
