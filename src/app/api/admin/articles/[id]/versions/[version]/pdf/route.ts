import { adminAccess } from '@/lib/admin-access';
import { getArticleVersions, readVersionPdf } from '@/lib/article-versions';
import { createServerClient } from '@/lib/supabase/server';
import { streamPdf } from '@/lib/pdf/stream';
import type { ArticleVersion } from '@/types/journal';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; version: string }> }) {
  const denied = await adminAccess(); if (denied) return denied;
  const { id, version } = await params;
  if (![id, version].every(value => /^[a-zA-Z0-9-]{1,80}$/.test(value))) return new Response(null, { status: 404 });
  const client = createServerClient();
  let record: ArticleVersion | undefined;
  if (client) {
    const { data, error } = await client.from('article_versions').select('*').eq('id', version).eq('article_id', id).maybeSingle();
    if (error) return new Response('Versiya olinmadi', { status: 503 });
    record = data || undefined;
  } else record = (await getArticleVersions(id)).find(item => item.id === version);
  if (!record) return new Response(null, { status: 404 });
  const bytes = await readVersionPdf(record);
  if (!bytes) return new Response(null, { status: 404 });
  return new Response(streamPdf(bytes), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="agm-${id}-v${record.revision}.pdf"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}
