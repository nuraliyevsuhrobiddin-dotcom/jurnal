import { NextRequest, NextResponse } from 'next/server';
import { getIssueById, getPublishedArticles, getJournalSettings } from '@/lib/db';
import { buildIssueCollection, IssueCollectionError } from '@/lib/pdf/issue-collection';
import { protectRequest } from '@/lib/request-limit';
import { streamPdf } from '@/lib/pdf/stream';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) return new NextResponse('Issue not found', { status: 404 });
  const limited = await protectRequest(request, 'issue-pdf', 6, 60); if (limited) return limited;
  try {
    const issue = await getIssueById(id);
    if (!issue) return new NextResponse('Issue not found', { status: 404 });
    const [articles, settings] = await Promise.all([getPublishedArticles({ issueId: id }), getJournalSettings()]);
    const bytes = await buildIssueCollection(issue, articles, settings);
    return new NextResponse(streamPdf(bytes), { headers: {
      'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="agm-volume-${issue.volume}-issue-${issue.issue_number}-${issue.year}.pdf"`,
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    } });
  } catch (error) {
    if (error instanceof IssueCollectionError) return new NextResponse(error.message, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
    console.error('Issue PDF generation failed:', error);
    return new NextResponse('Unable to prepare the complete issue. Please contact the editorial office.', { status: 500 });
  }
}
