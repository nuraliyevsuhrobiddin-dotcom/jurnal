import { timingSafeEqual } from 'node:crypto';
import { runContentBackup } from '@/lib/content-backup';
import { protectRequest } from '@/lib/request-limit';
import { NextRequest, NextResponse } from 'next/server';
export const maxDuration = 60;
export async function GET(request: NextRequest) {
  const actual = Buffer.from(request.headers.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET || ''}`);
  if (!process.env.CRON_SECRET || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const limited = await protectRequest(request, 'scheduled-backup', 2, 3600); if (limited) return limited;
  try { return NextResponse.json({ backup: await runContentBackup() }, { headers: { 'Cache-Control': 'private, no-store' } }); }
  catch { return NextResponse.json({ error: 'Backup failed; check private storage and limits.' }, { status: 503 }); }
}
