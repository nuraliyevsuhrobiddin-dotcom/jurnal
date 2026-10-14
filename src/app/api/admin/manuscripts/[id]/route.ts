import { NextRequest, NextResponse } from 'next/server';
import { adminAccess } from '@/lib/admin-access';
import { readManuscript } from '@/lib/manuscript-storage';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminAccess(); if (denied) return denied;
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id)) return NextResponse.json({ error: 'File not found' }, { status: 404 });
  const file = await readManuscript(id);
  if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 });
  return new NextResponse(Buffer.from(file.bytes), { headers: {
    'Content-Type': file.metadata.contentType,
    'Content-Disposition': `attachment; filename="manuscript-${id}.${file.metadata.extension}"; filename*=UTF-8''${encodeURIComponent(file.metadata.name)}`,
    'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
  } });
}
