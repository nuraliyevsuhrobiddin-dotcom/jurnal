import { NextRequest } from 'next/server';
import { adminAccess } from '@/lib/admin-access';
import { getPublishedArticles, getJournalSettings } from '@/lib/db';
import { archivePackage } from '@/lib/archive-package';
import { IntegrationError } from '@/lib/integration-config';
import { protectRequest } from '@/lib/request-limit';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const denied = await adminAccess(); if (denied) return denied;
  const limited = await protectRequest(request, 'archive-export', 5, 3600); if (limited) return limited;
  const issueId = request.nextUrl.searchParams.get('issue_id') || undefined;
  if (issueId && !/^[a-f0-9-]{36}$/i.test(issueId)) return Response.json({ error: 'Invalid issue' }, { status: 400 });
  try {
    const [articles, settings] = await Promise.all([getPublishedArticles({ issueId, limit: 26 }), getJournalSettings()]);
    const bytes = await archivePackage(articles, settings);
    return new Response(Buffer.from(bytes), { headers: { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="agm-publication-archive.zip"', 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return Response.json({ error: error instanceof IntegrationError ? error.message : 'Arxivni yaratib bo‘lmadi.' }, { status: error instanceof IntegrationError ? error.status : 503 });
  }
}
