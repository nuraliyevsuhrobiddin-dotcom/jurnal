import { adminAccess } from '@/lib/admin-access';
import { getArticleById, getJournalSettings } from '@/lib/db';
import { crossrefXml, CrossrefExportError } from '@/lib/crossref-export';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminAccess();
  if (denied) return denied;
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(id)) return new Response(null, { status: 404 });
  try {
    const article = await getArticleById(id);
    if (!article) return new Response(null, { status: 404 });
    const content = crossrefXml(article, await getJournalSettings());
    return new Response(content, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Content-Disposition': `attachment; filename="crossref-${id}.xml"`, 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return Response.json({ error: error instanceof CrossrefExportError ? error.message : 'Crossref export unavailable' }, { status: error instanceof CrossrefExportError ? 422 : 503 });
  }
}
