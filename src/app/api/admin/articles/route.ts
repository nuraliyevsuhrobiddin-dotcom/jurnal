import { adminAccess } from '@/lib/admin-access';
import { after, NextRequest, NextResponse } from 'next/server';
import { queueArticleNotifications } from '@/lib/publication-notifications';
import { drainNotificationQueue, mailConfigured } from '@/lib/notifications';
import { getAllArticlesAdmin, createArticle } from '@/lib/db';
import { z } from 'zod';
import { articleSchema } from '@/lib/article-validation';
import { PublicationError } from '@/lib/publication-ready';
import { getAdminArticlePage } from '@/lib/article-page';

export const maxDuration = 60;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘'’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `article-${Date.now()}`;
}

export async function GET(request: NextRequest) {
  const denied = await adminAccess();
  if (denied) return denied;
  try {
    if (request.nextUrl.searchParams.has('page')) {
      const values = request.nextUrl.searchParams;
      const status = values.get('status') || undefined;
      if (status && !['draft', 'under_review', 'approved', 'published', 'rejected', 'withdrawn', 'archived'].includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      return NextResponse.json(await getAdminArticlePage({ page: values.get('page') || '1', query: values.get('q') || '', status }));
    }
    const articles = await getAllArticlesAdmin();
    return NextResponse.json(articles);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await adminAccess();
  if (denied) return denied;
  try {
    const body = await request.json();
    const validated = articleSchema.parse(body);

    const slug = slugify(validated.title_en || validated.title_uz);

    const created = await createArticle({
      ...validated,
      slug,
      references_list: validated.references_list || [],
    });

    if (created.status === 'published') {
      try {
        await queueArticleNotifications({ ...created, status: 'draft' }, created);
        if (mailConfigured()) after(async () => { await drainNotificationQueue(30, 30000); });
      } catch {
        return NextResponse.json({ ...created, notification_warning: 'Maqola saqlandi. Sertifikat va email navbatini yaratish uchun maqolani qayta saqlang.' }, { status: 201 });
      }
    }
    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof PublicationError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: (error instanceof Error ? error.message : null) || 'Server error' }, { status: 500 });
  }
}
