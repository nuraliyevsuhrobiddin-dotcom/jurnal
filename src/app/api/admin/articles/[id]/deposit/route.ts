import { NextRequest, NextResponse } from 'next/server';
import { adminAccess } from '@/lib/admin-access';
import { getArticleById, getJournalSettings } from '@/lib/db';
import { boundedBody, BodyLimitError } from '@/lib/bounded-body';
import { protectRequest } from '@/lib/request-limit';
import { submitCrossref, prepareZenodoDraft } from '@/lib/scholarly-deposits';
import { IntegrationError } from '@/lib/integration-config';
import { CrossrefExportError } from '@/lib/crossref-export';

export const maxDuration = 60;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminAccess(); if (denied) return denied;
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(id)) return new Response(null, { status: 404 });
  const limited = await protectRequest(request, 'scholarly-deposit', 10, 3600); if (limited) return limited;
  try {
    let body;
    try { body = JSON.parse(new TextDecoder().decode(await boundedBody(request, 4096))); }
    catch (error) { if (error instanceof BodyLimitError) throw error; return NextResponse.json({ error: 'Noto‘g‘ri JSON.' }, { status: 400 }); }
    if (!body || !['crossref', 'zenodo'].includes(body.provider) || Object.keys(body).some(key => key !== 'provider')) return NextResponse.json({ error: 'crossref yoki zenodo xizmatini tanlang.' }, { status: 400 });
    const [article, settings] = await Promise.all([getArticleById(id), getJournalSettings()]);
    if (!article) return new Response(null, { status: 404 });
    const job = body.provider === 'crossref' ? await submitCrossref(article, settings) : await prepareZenodoDraft(article, settings);
    return NextResponse.json({ job }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const status = error instanceof BodyLimitError ? 413 : error instanceof IntegrationError ? error.status : error instanceof CrossrefExportError ? 422 : 503;
    return NextResponse.json({ error: error instanceof IntegrationError || error instanceof CrossrefExportError ? error.message : 'Depozit bajarilmadi. Integratsiya jurnalini tekshiring.' }, { status });
  }
}
