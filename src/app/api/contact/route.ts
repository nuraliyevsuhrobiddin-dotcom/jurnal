import { after, NextRequest, NextResponse } from 'next/server';
import { queueNotification, deliverNotification } from '@/lib/notifications';
import { getJournalSettings } from '@/lib/db';
import { boundedBody, BodyLimitError } from '@/lib/bounded-body';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { journalStore } from '@/lib/data-store';
import { remoteSave } from '@/lib/remote-db';
import { protectRequest } from '@/lib/request-limit';

const contactSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(10).max(5000),
});

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  const limited = await protectRequest(request, 'contact', 5);
  if (limited) return limited;
  if (Number(request.headers.get('content-length') || 0) > 16384) return NextResponse.json({ error: 'Message too large' }, { status: 413 });
  try {
    const parsed = contactSchema.safeParse(JSON.parse(new TextDecoder().decode(await boundedBody(request, 16384))));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ism, to‘g‘ri email va kamida 10 belgili xabar kiriting.' }, { status: 400 });
    }
    journalStore.refresh();
    const message = { ...parsed.data, id: randomUUID(), created_at: new Date().toISOString() };
    if (!(await remoteSave('contact_messages', message))) {
      journalStore.contactMessages.unshift(message);
      journalStore.persist();
    }
    try {
      const settings = await getJournalSettings();
      const notification = await queueNotification({ recipient: settings.contact_email, subject: 'AGM Journal — yangi murojaat', body: `From: ${message.name} <${message.email}>\n\n${message.message}\n\nReference: ${message.id}` });
      after(async () => { await deliverNotification(notification); });
    } catch (error) { console.error('Contact notification queue failed:', error); }
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof BodyLimitError) return NextResponse.json({ error: 'Message too large' }, { status: 413 });
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    return NextResponse.json({ error: 'Xabarni saqlab bo‘lmadi. Keyinroq qayta urinib ko‘ring.' }, { status: 500 });
  }
}
