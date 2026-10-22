import { timingSafeEqual } from 'node:crypto';
import { drainNotificationQueue, mailConfigured } from '@/lib/notifications';

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: 'Scheduler not configured' }, { status: 503 });
  const actual = Buffer.from(request.headers.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${secret}`);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!mailConfigured()) return Response.json({ error: 'Mail not configured' }, { status: 503 });
  try {
    return Response.json(await drainNotificationQueue(), { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Notification worker unavailable' }, { status: 503 }); }
}
