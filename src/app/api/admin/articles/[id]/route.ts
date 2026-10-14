import { adminAccess } from '@/lib/admin-access';
import { NextRequest, NextResponse } from 'next/server';
import { updateArticle, updateArticleStatus, getArticleById, deleteArticle } from '@/lib/db';
import { Article, ArticleStatus } from '@/types/journal';
import { articleSchema, articleUpdateSchema, articleClearFields } from '@/lib/article-validation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await adminAccess();
  if (denied) return denied;
  const { id } = await params;
  const article = await getArticleById(id);
  if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(article);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await adminAccess();
  if (denied) return denied;
  try {
    const { id } = await params;
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid article data' }, { status: 400 });

    if (body.action === 'change_status' && body.status) {
      const validStatuses: ArticleStatus[] = [
        'draft', 'under_review', 'approved', 'published', 'rejected', 'withdrawn', 'archived'
      ];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }

      if (body.retraction_reason !== undefined && typeof body.retraction_reason !== 'string') return NextResponse.json({ error: 'Invalid reason' }, { status: 400 });
      const updated = await updateArticleStatus(id, body.status, body.retraction_reason);
      if (!updated) return NextResponse.json({ error: 'Article not found' }, { status: 404 });
      return NextResponse.json(updated);
    }

    const current = await getArticleById(id);
    if (!current) return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    const { clear_fields, ...payload } = body;
    const parsed = articleUpdateSchema.safeParse(payload);
    const cleared = articleClearFields.safeParse(clear_fields);
    if (!parsed.success || !cleared.success) return NextResponse.json({ error: 'Invalid article data', fields: !parsed.success ? parsed.error.flatten() : undefined }, { status: 400 });
    const updates = Object.fromEntries(Object.entries(parsed.data).filter(([key]) => Object.hasOwn(payload, key))) as Partial<Article>;
    for (const key of cleared.data) Object.assign(updates, { [key]: undefined });
    const candidate = { ...current, ...updates };
    if (candidate.status === 'published' && !candidate.publication_date) {
      candidate.publication_date = current.publication_date || new Date().toISOString().slice(0, 10);
      updates.publication_date = candidate.publication_date;
    }
    const complete = articleSchema.safeParse(candidate);
    if (!complete.success) return NextResponse.json({ error: 'Invalid article data', fields: complete.error.flatten() }, { status: 400 });
    const updated = await updateArticle(id, updates);
    if (!updated) return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : null) || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await adminAccess();
  if (denied) return denied;
  try {
    const { id } = await params;
    const deleted = await deleteArticle(id);
    if (!deleted) return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : null) || 'Server error' }, { status: 500 });
  }
}
