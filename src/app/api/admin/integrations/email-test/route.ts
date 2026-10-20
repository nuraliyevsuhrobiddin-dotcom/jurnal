import { NextRequest, NextResponse } from 'next/server';
import { adminAccess } from '@/lib/admin-access';
import { protectRequest } from '@/lib/request-limit';
import { mailConfigured, queueNotification, deliverNotification } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  const denied = await adminAccess(); if (denied) return denied;
  const limited = await protectRequest(request, 'integration-test-email', 3, 3600); if (limited) return limited;
  if (!mailConfigured()) return NextResponse.json({ error: 'RESEND_API_KEY va MAIL_FROM kerak.' }, { status: 503 });
  try {
    const notification = await queueNotification({ recipient: 'delivered@resend.dev', subject: 'AGM Journal integration test', body: 'Technical test of the AGM Journal notification outbox. No manuscript or personal data is included.' });
    const accepted = await deliverNotification(notification);
    return NextResponse.json({ accepted, notification_id: notification.id, message: accepted ? 'Sinov xati Resend test manziliga topshirildi. Bu shaxsiy pochta qutisiga yetkazilganlik isboti emas.' : 'Sinov xati navbatda qoldi; provayder xatosini email bo‘limida tekshiring.' }, { status: accepted ? 200 : 502 });
  } catch { return NextResponse.json({ error: 'Sinov xatini navbatga qo‘shib bo‘lmadi.' }, { status: 503 }); }
}
