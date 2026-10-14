import { adminAccess } from '@/lib/admin-access';
import { NextRequest, NextResponse } from 'next/server';
import { getJournalSettings, updateJournalSettings } from '@/lib/db';
import { z } from 'zod';

const settingsSchema = z.object({
  journal_name: z.string().trim().min(2).max(150),
  tagline: z.string().trim().min(2).max(500),
  publisher: z.string().trim().min(2).max(150),
  established_year: z.number().int().min(1800).max(2200),
  contact_email: z.string().email(),
  contact_phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  issn_print: z.string().max(20).optional(),
  issn_online: z.string().max(20).optional(),
  doi_prefix: z.string().max(150).optional(),
});

export async function GET() {
  const denied = await adminAccess();
  if (denied) return denied;
  try {
    const settings = await getJournalSettings();
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await adminAccess();
  if (denied) return denied;
  try {
    const body = await request.json();
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Sozlamalar noto‘g‘ri. Majburiy maydonlar va emailni tekshiring.', details: parsed.error.flatten() }, { status: 400 });
    const updated = await updateJournalSettings(parsed.data);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : null) || 'Server error' }, { status: 500 });
  }
}
