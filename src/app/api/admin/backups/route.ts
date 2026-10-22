import { NextRequest, NextResponse } from 'next/server';
import { adminAccess } from '@/lib/admin-access';
import { createServerClient } from '@/lib/supabase/server';
import { runContentBackup } from '@/lib/content-backup';
import { protectRequest } from '@/lib/request-limit';
import { logAudit } from '@/lib/db';
export const maxDuration = 60;
export async function GET(request: NextRequest) {
  const denied = await adminAccess(['owner']); if (denied) return denied;
  const db = createServerClient(); if (!db) return NextResponse.json({ configured: false, latest: null });
  const id = request.nextUrl.searchParams.get('download');
  if (id) {
    if (!/^[a-f0-9-]{36}$/i.test(id)) return new Response(null, { status: 404 });
    const { data, error } = await db.storage.from('journal-backups').download(`${id}.zip`);
    if (error || !data) return new Response(null, { status: 404 });
    await logAudit('backup_downloaded', 'backup', id);
    return new Response(data, { headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="agm-backup-${id}.zip"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  }
  const { data, error } = await db.from('backup_runs').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) return NextResponse.json({ error: 'Migration 014 kerak.' }, { status: 503 });
  return NextResponse.json({ configured: true, latest: data }, { headers: { 'Cache-Control': 'private, no-store' } });
}
export async function POST(request: NextRequest) {
  const denied = await adminAccess(['owner']); if (denied) return denied;
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  const limited = await protectRequest(request, 'content-backup', 3, 3600); if (limited) return limited;
  try {
    const backup = await runContentBackup();
    await logAudit('backup_verified', 'backup', backup.id, { files: backup.files, tables: backup.tables });
    return NextResponse.json({ backup }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { console.error('Content backup failed:', error instanceof Error ? error.message : 'unknown'); return NextResponse.json({ error: 'Zaxira nusxasi yakunlanmadi. Hajm, ombor va migration 014 ni tekshiring.' }, { status: 503 }); }
}
