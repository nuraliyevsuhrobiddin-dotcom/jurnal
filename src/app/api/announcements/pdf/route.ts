import { NextRequest, NextResponse } from 'next/server';
import { getJournalSettings } from '@/lib/db';
import { generateAnnouncementPdf } from '@/lib/pdf/announcement-generator';
import type { Language } from '@/types/journal';

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get('lang') || 'uz';
  if (!['uz', 'en', 'ru'].includes(input)) return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
  try {
    const bytes = await generateAnnouncementPdf(await getJournalSettings(), input as Language);
    return new NextResponse(Buffer.from(bytes), { headers: {
      'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="agm-call-for-papers-${input}.pdf"`, 'Cache-Control': 'no-store',
    } });
  } catch {
    return NextResponse.json({ error: 'Axborot xatini yaratib bo‘lmadi.' }, { status: 500 });
  }
}
