import { NextRequest, NextResponse } from 'next/server';
import { adminAccess } from '@/lib/admin-access';
import { drainNotificationQueue, listNotifications, mailConfigured } from '@/lib/notifications';
import { protectRequest } from '@/lib/request-limit';

export const maxDuration = 60;

export async function GET() {
  const denied = await adminAccess(); if (denied) return denied;
  try {
    const rows = await listNotifications();
    return NextResponse.json({ configured: mailConfigured(), notifications: rows.map(({ body: _body, ...row }) => { void _body; return row; }) });
  } catch { return NextResponse.json({ error: 'Email outbox unavailable. Apply migration 008.' }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  const denied = await adminAccess(); if (denied) return denied;
  const limited = await protectRequest(request, 'retry-email', 10, 60); if (limited) return limited;
  if (!mailConfigured()) return NextResponse.json({ error: 'Gmail yoki Resend email sozlamalarini kiriting.' }, { status: 503 });
  try {
    return NextResponse.json(await drainNotificationQueue());
  } catch { return NextResponse.json({ error: 'Email yuborilmadi.' }, { status: 503 }); }
}
