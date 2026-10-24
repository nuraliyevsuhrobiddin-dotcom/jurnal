import { adminAccess } from '@/lib/admin-access';
import { NextRequest, NextResponse } from 'next/server';
import { getJournalSettings, updateJournalSettings } from '@/lib/db';
import { z } from 'zod';
import { isValidIssn } from '@/lib/identifiers';

const issn = z.string().trim().max(20).refine(value => !value || isValidIssn(value), 'ISSN tekshiruv raqami noto‘g‘ri. Faqat rasmiy berilgan ISSNni kiriting.').optional();

const settingsSchema = z.object({
  journal_name: z.string().trim().min(2).max(150),
  tagline: z.string().trim().min(2).max(500),
  publisher: z.string().trim().min(2).max(150),
  established_year: z.number().int().min(1800).max(2200),
  contact_email: z.string().email(),
  contact_phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  issn_print: issn,
  issn_online: issn,
  doi_prefix: z.string().trim().refine(value => !value || /^10\.\d{4,9}$/.test(value), 'Faqat xizmat tomonidan berilgan DOI prefiksini kiriting: 10.xxxx').optional(),
});

export async function GET() {
  const denied = await adminAccess(['owner']);
  if (denied) return denied;
  try {
    const settings = await getJournalSettings();
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await adminAccess(['owner']);
  if (denied) return denied;
  try {
    const body = await request.json();
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.slice(0, 3).map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; '), details: parsed.error.flatten() }, { status: 400 });
    const updated = await updateJournalSettings(parsed.data);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : null) || 'Server error' }, { status: 500 });
  }
}
