import { adminAccess } from '@/lib/admin-access';
import { NextResponse } from 'next/server';
import { getAuditLogs } from '@/lib/db';

export async function GET() {
  const denied = await adminAccess(['owner']);
  if (denied) return denied;
  try {
    const logs = await getAuditLogs();
    return NextResponse.json(logs);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
