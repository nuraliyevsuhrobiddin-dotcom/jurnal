import { after, NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAllArticlesAdmin } from '@/lib/db';
import { trackingUrl, submissionReference } from '@/lib/submission-tracking';
import { deliverNotification, queueNotificationOnce } from '@/lib/notifications';
import { protectRequest } from '@/lib/request-limit';
import { boundedBody } from '@/lib/bounded-body';

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  const limited = await protectRequest(request, 'tracking-link', 5, 900); if (limited) return limited;
  try {
    const input = z.object({ email: z.email().transform(value => value.toLowerCase()), reference: z.string().trim().toUpperCase().regex(/^AGM-SUB-[A-F0-9]{8}$/) }).safeParse(JSON.parse(new TextDecoder().decode(await boundedBody(request, 4096))));
    if (!input.success) return NextResponse.json({ error: 'Email va AGM-SUB-XXXXXXXX shaklidagi yuborish raqamini kiriting.' }, { status: 400 });
    const emailLimit = await protectRequest(request, 'tracking-link-email', 3, 3600, input.data.email); if (emailLimit) return emailLimit;
    after(async () => {
      try {
        const article = (await getAllArticlesAdmin()).find(article => submissionReference(article) === input.data.reference && article.authors?.some(author => author.is_corresponding && author.email?.toLowerCase() === input.data.email));
        if (!article) return;
        const event = `tracking-link:${article.id}:${Math.floor(Date.now() / 3600000)}`;
        const notification = await queueNotificationOnce(event, { recipient: input.data.email, subject: 'AGM Journal — Maqola holati / Manuscript tracking', body: `Maqolangiz holatini ushbu maxfiy havola orqali kuzating.\nTrack your manuscript using this private link:\n\n${trackingUrl(article.id)}\n\n${input.data.reference}\nHavolani begonalarga bermang. / Keep this link private.` });
        if (notification) await deliverNotification(notification);
      } catch { console.error('Tracking link could not be queued. Check database and email configuration.'); }
    });
    return NextResponse.json({ success: true, message: 'Ma’lumotlar mos bo‘lsa, kuzatish havolasi emailingizga yuboriladi. / If the details match, a tracking link will be emailed.' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'So‘rovni yuborib bo‘lmadi.' }, { status: 400 }); }
}
