import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminAccess } from '@/lib/admin-access';
import { deleteEditorialBoardMember, updateEditorialBoardMember } from '@/lib/db';
import { editorialMemberSchema } from '../route';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const denied = await adminAccess();
  if (denied) return denied;
  try {
    const { id } = await params;
    const member = editorialMemberSchema.parse(await request.json());
    const updated = await updateEditorialBoardMember(id, member);
    return updated ? NextResponse.json(updated) : NextResponse.json({ error: 'A’zo topilmadi.' }, { status: 404 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Maydonlarni tekshiring.', details: error.flatten() }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Saqlash amalga oshmadi.' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const denied = await adminAccess();
  if (denied) return denied;
  try {
    const { id } = await params;
    const archived = await deleteEditorialBoardMember(id);
    return archived ? NextResponse.json(archived) : NextResponse.json({ error: 'A’zo topilmadi.' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'A’zoni nofaol qilish amalga oshmadi.' }, { status: 500 });
  }
}
