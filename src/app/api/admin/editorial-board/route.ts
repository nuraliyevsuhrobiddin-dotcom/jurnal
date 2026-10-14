import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminAccess } from '@/lib/admin-access';
import { createEditorialBoardMember, getAllEditorialBoardMembers } from '@/lib/db';

const optionalText = (max: number) => z.preprocess(value => value === '' ? undefined : value, z.string().trim().max(max).optional());
export const editorialMemberSchema = z.object({
  full_name: z.string().trim().min(2).max(160),
  academic_title: optionalText(160),
  academic_degree: optionalText(240),
  affiliation: z.string().trim().min(2).max(240),
  country: z.string().trim().min(2).max(100),
  email: z.preprocess(value => value === '' ? undefined : value, z.union([z.string().trim().email().max(254), z.undefined()])),
  orcid: z.preprocess(value => value === '' ? undefined : value, z.string().trim().regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/).optional()),
  role: z.enum(['editor_in_chief', 'deputy_editor', 'editorial_board_member', 'scientific_secretary', 'managing_editor']),
  order_index: z.number().int().min(0).max(10000),
  is_active: z.boolean(),
});

export async function GET() {
  const denied = await adminAccess();
  if (denied) return denied;
  try {
    return NextResponse.json(await getAllEditorialBoardMembers());
  } catch {
    return NextResponse.json({ error: 'Tahririyat a’zolarini yuklab bo‘lmadi.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await adminAccess();
  if (denied) return denied;
  try {
    const member = editorialMemberSchema.parse(await request.json());
    return NextResponse.json(await createEditorialBoardMember(member), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Maydonlarni tekshiring.', details: error.flatten() }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Saqlash amalga oshmadi.' }, { status: 500 });
  }
}
