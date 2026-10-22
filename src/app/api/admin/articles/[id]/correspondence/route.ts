import { after, NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminAccess } from '@/lib/admin-access';
import { getArticleById, updateArticleStatus, logAudit } from '@/lib/db';
import { editorialMessages, saveEditorialMessage } from '@/lib/editorial-messages';
import { deliverNotification, queueNotificationOnce } from '@/lib/notifications';
import { trackingUrl } from '@/lib/submission-tracking';
import { boundedBody } from '@/lib/bounded-body';

export const maxDuration = 60;
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminAccess(); if (denied) return denied;
  try {
    const { id } = await params;
    const article = await getArticleById(id);
    if (!article) return NextResponse.json({ error: 'Maqola topilmadi' }, { status: 404 });
    return NextResponse.json({ messages: await editorialMessages(id), tracking_url: trackingUrl(id) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Yozishmalar yuklanmadi. Migration 011 ni tekshiring.' }, { status: 503 }); }
}
const schema = z.object({ id: z.uuid(), kind: z.enum(['note', 'revision_requested']), body: z.string().trim().min(5).max(10000) });
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminAccess(); if (denied) return denied;
  if (request.headers.get('origin') && request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  try {
    const { id } = await params;
    const parsed = schema.safeParse(JSON.parse(new TextDecoder().decode(await boundedBody(request, 50000))));
    if (!parsed.success) return NextResponse.json({ error: 'Izoh 5–10000 belgidan iborat bo‘lsin.' }, { status: 400 });
    const article = await getArticleById(id);
    if (!article) return NextResponse.json({ error: 'Maqola topilmadi' }, { status: 404 });
    if (parsed.data.kind === 'revision_requested' && !['draft', 'under_review', 'approved'].includes(article.status)) return NextResponse.json({ error: 'Bu holatdagi maqolaga tuzatish so‘rab bo‘lmaydi.' }, { status: 409 });
    const recipient = article.authors?.find(author => author.is_corresponding && z.email().safeParse(author.email).success)?.email;
    if (!recipient) return NextResponse.json({ error: 'Mas’ul muallifning emailini kiriting.' }, { status: 422 });
    if (parsed.data.kind === 'revision_requested' && article.status !== 'under_review') await updateArticleStatus(id, 'under_review');
    const message = await saveEditorialMessage({ ...parsed.data, article_id: id, created_at: new Date().toISOString() });
    let warning: string | undefined;
    try {
      const notification = await queueNotificationOnce(`editorial:${message.id}`, {
        recipient, subject: message.kind === 'revision_requested' ? 'AGM Journal — Tuzatish so‘raldi / Revision requested' : 'AGM Journal — Tahririyat xabari / Editorial note',
        body: `${message.body}\n\nMaqola holati / Track your manuscript:\n${trackingUrl(id)}`,
      });
      if (notification) after(async () => { await deliverNotification(notification); });
    } catch { warning = 'Izoh saqlandi, lekin email navbatga qo‘shilmadi. Shu xabarni qayta yuboring.'; }
    await logAudit('EDITORIAL_MESSAGE', 'article', id, { message_id: message.id, kind: message.kind });
    return NextResponse.json({ ...message, warning });
  } catch { return NextResponse.json({ error: 'Izoh saqlanmadi. Baza ulanishi va migration 011 ni tekshiring.' }, { status: 503 }); }
}
