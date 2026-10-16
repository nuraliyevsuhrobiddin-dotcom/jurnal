import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { findSubject } from '@/lib/subjects';
import { getIssueById, getJournalSettings } from '@/lib/db';
import { subjectCoverSvg } from '@/lib/issues/subject-cover-art';

export const runtime = 'nodejs';
export async function GET(request: NextRequest, { params }: { params: Promise<{ subject: string }> }) {
  const { subject } = await params;
  if (!findSubject(subject)) return new NextResponse(null, { status: 404 });
  const issueId = request.nextUrl.searchParams.get('issue');
  if (issueId && !/^[a-f0-9-]{36}$/i.test(issueId)) return new NextResponse(null, { status: 404 });
  const issue = issueId ? await getIssueById(issueId) : undefined;
  if (issueId && !issue) return new NextResponse(null, { status: 404 });
  const settings = await getJournalSettings();
  const png = await sharp(Buffer.from(subjectCoverSvg(subject, issue || undefined, settings))).resize(600, 849).png().toBuffer();
  return new NextResponse(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' } });
}
