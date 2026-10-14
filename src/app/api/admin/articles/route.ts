import { adminAccess } from '@/lib/admin-access';
import { NextRequest, NextResponse } from 'next/server';
import { getAllArticlesAdmin, createArticle } from '@/lib/db';
import { z } from 'zod';
import { articleSchema } from '@/lib/article-validation';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘'’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `article-${Date.now()}`;
}

export async function GET() {
  const denied = await adminAccess();
  if (denied) return denied;
  try {
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

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: (error instanceof Error ? error.message : null) || 'Server error' }, { status: 500 });
  }
}
