import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { journalStore } from '@/lib/data-store';
import { remoteSave } from '@/lib/remote-db';

const contactSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(10).max(5000),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = contactSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ism, to‘g‘ri email va kamida 10 belgili xabar kiriting.' }, { status: 400 });
    }
    journalStore.refresh();
    const message = { ...parsed.data, id: randomUUID(), created_at: new Date().toISOString() };
    if (!(await remoteSave('contact_messages', message))) {
      journalStore.contactMessages.unshift(message);
      journalStore.persist();
    }
    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Xabarni saqlab bo‘lmadi. Keyinroq qayta urinib ko‘ring.' }, { status: 500 });
  }
}
