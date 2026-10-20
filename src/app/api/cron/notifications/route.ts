import { timingSafeEqual } from 'node:crypto';
import { deliverNotification, listNotifications, mailConfigured } from '@/lib/notifications';

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: 'Scheduler not configured' }, { status: 503 });
  const actual = Buffer.from(request.headers.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${secret}`);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!mailConfigured()) return Response.json({ error: 'Mail not configured' }, { status: 503 });
  try {
    const pending = (await listNotifications(true)).slice(0, 3);
    let sent = 0;
    for (const item of pending) if (await deliverNotification(item)) sent++;
    return Response.json({ attempted: pending.length, sent }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Notification worker unavailable' }, { status: 503 }); }
}
