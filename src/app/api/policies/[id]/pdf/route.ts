import { NextRequest, NextResponse } from 'next/server';
import { getJournalSettings } from '@/lib/db';
import { getHandbookHash, getPolicyDocument, getPolicyDocuments, getPolicyHash, isJournalLanguage, isPolicyId } from '@/lib/policies';
import { generatePolicyPdf } from '@/lib/pdf/policy-generator';
import { POLICY_VERSION, type PolicyId } from '@/types/policies';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lang = request.nextUrl.searchParams.get('lang') || 'uz';
  if (!isJournalLanguage(lang)) return NextResponse.json({ error: 'Unsupported language' }, { status: 400 });
  if (id !== 'handbook' && !isPolicyId(id)) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  try {
    const settings = await getJournalSettings();
    const documents = id === 'handbook' ? getPolicyDocuments(lang, settings) : [getPolicyDocument(id as PolicyId, lang, settings)];
    const title = id === 'handbook' ? (lang === 'uz' ? 'Jurnal nizomi va tahririyat siyosatlari' : lang === 'ru' ? 'Регламент журнала и редакционные политики' : 'Journal charter and editorial policy handbook') : documents[0].title;
    const hash = id === 'handbook' ? getHandbookHash(documents, lang) : getPolicyHash(documents[0], lang);
    const verify = new URL(`/${lang}/policies/verify`, process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin);
    verify.search = new URLSearchParams({ id, version: POLICY_VERSION, hash }).toString();
    const bytes = await generatePolicyPdf({ documents, settings, lang, title, verificationUrl: verify.toString(), hash });
    return new NextResponse(Buffer.from(bytes), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="agm-${id}-${lang}-v${POLICY_VERSION}.pdf"`, 'Cache-Control': 'no-store', 'X-Document-SHA256': hash, 'X-Document-Version': POLICY_VERSION } });
  } catch (cause) {
    console.error('Policy PDF generation failed:', cause);
    return NextResponse.json({ error: 'Document could not be generated' }, { status: 500 });
  }
}
