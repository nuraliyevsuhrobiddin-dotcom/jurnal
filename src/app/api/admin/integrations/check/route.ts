import { NextRequest, NextResponse } from 'next/server';
import { adminAccess } from '@/lib/admin-access';
import { protectRequest } from '@/lib/request-limit';
import { checkIntegrations } from '@/lib/integration-checks';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const denied = await adminAccess(); if (denied) return denied;
  const limited = await protectRequest(request, 'integration-check', 10, 60); if (limited) return limited;
  return NextResponse.json({ checked_at: new Date().toISOString(), checks: await checkIntegrations() }, { headers: { 'Cache-Control': 'private, no-store' } });
}
