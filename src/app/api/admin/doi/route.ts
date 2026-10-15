import { NextRequest, NextResponse } from 'next/server';
import { adminAccess } from '@/lib/admin-access';
import { inspectDoi } from '@/lib/doi';
import { protectRequest } from '@/lib/request-limit';

export async function GET(request: NextRequest) {
  const denied = await adminAccess(); if (denied) return denied;
  const limited = await protectRequest(request, 'doi-check', 20, 60); if (limited) return limited;
  const value = request.nextUrl.searchParams.get('doi') || '';
  if (value.length > 500) return NextResponse.json({ error: 'DOI too long' }, { status: 400 });
  return NextResponse.json(await inspectDoi(value), { headers: { 'Cache-Control': 'no-store' } });
}
