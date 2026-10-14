import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminAccess } from '@/lib/admin-access';
import { updateIssue, deleteIssue } from '@/lib/db';
import { issueSchema } from '../route';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminAccess();
  if (denied) return denied;
  try {
    const { id } = await params;
    const data = issueSchema.parse(await request.json());
    const updated = await updateIssue(id, data);
    return updated ? NextResponse.json(updated) : NextResponse.json({ error: 'Jurnal soni topilmadi.' }, { status: 404 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Maydonlarni tekshiring.', details: error.flatten() }, { status: 400 });
    const message = error instanceof Error ? error.message : 'Jurnal sonini saqlab bo‘lmadi.';
    return NextResponse.json({ error: message }, { status: message.startsWith('Joriy sonni almashtirish') ? 400 : 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminAccess();
  if (denied) return denied;
  try {
    const { id } = await params;
    const deleted = await deleteIssue(id);
    return deleted ? NextResponse.json({ success: true, id }) : NextResponse.json({ error: 'Jurnal soni topilmadi.' }, { status: 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'O‘chirish amalga oshmadi.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
