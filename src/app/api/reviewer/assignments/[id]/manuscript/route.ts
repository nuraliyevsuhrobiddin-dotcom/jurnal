import { NextResponse } from 'next/server';
import { reviewerIdentity, assignedReview } from '@/lib/reviews';
import { getArticleById } from '@/lib/db';
import { readManuscript } from '@/lib/manuscript-storage';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await reviewerIdentity(); if (!identity) return NextResponse.json({ error: 'Hisobga kiring.' }, { status: 401 });
  const { id } = await context.params;
  if (!/^[a-f0-9-]{36}$/i.test(id)) return new Response(null, { status: 404 });
  const assignment = await assignedReview(id, identity.id);
  if (!assignment) return new Response(null, { status: 404 });
  const article = await getArticleById(assignment.article_id);
  const manuscriptId = article?.manuscript_file_url?.match(/^\/api\/admin\/manuscripts\/([a-f0-9-]{36})$/i)?.[1];
  if (!manuscriptId) return new Response(null, { status: 404 });
  const file = await readManuscript(manuscriptId);
  if (!file) return new Response(null, { status: 404 });
  return new Response(Buffer.from(file.bytes), { headers: { 'Content-Type': file.metadata.contentType, 'Content-Disposition': `attachment; filename="review-manuscript.${file.metadata.extension}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex' } });
}
