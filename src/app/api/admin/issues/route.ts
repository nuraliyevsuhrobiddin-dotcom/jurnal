import { adminAccess } from '@/lib/admin-access';
import { NextRequest, NextResponse } from 'next/server';
import { getAllIssues, createIssue } from '@/lib/db';
import { z } from 'zod';

export const issueSchema = z.object({
  volume: z.number().int().positive('Jild raqami musbat son bo‘lishi kerak'),
  issue_number: z.number().int().positive('Son raqami musbat son bo‘lishi kerak'),
  year: z.number().int().min(2000, 'Yil kamida 2000 bo‘lishi kerak'),
  title_uz: z.string().optional(),
  title_en: z.string().optional(),
  title_ru: z.string().optional(),
  description_uz: z.string().optional(),
  description_en: z.string().optional(),
  description_ru: z.string().optional(),
  publication_date: z.iso.date(),
  is_current: z.boolean().default(false),
  cover_image_url: z.string().trim().max(1000).refine(value => (value.startsWith('/') && !value.startsWith('//')) || /^https:\/\//i.test(value), 'Muqova manzili /images/... ko‘rinishida yoki HTTPS havolasi bo‘lsin').optional(),
});

export async function GET() {
  const denied = await adminAccess();
  if (denied) return denied;
  try {
    const issues = await getAllIssues();
    return NextResponse.json(issues);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await adminAccess();
  if (denied) return denied;
  try {
    const body = await request.json();
    const validated = issueSchema.parse(body);
    const created = await createIssue(validated);
    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: (error instanceof Error ? error.message : null) || 'Server error' }, { status: 500 });
  }
}
