import { generateManuscriptTemplate } from '@/lib/manuscript-template';
import { manuscriptStandard } from '@/lib/manuscript-standard';
import type { Language } from '@/types/journal';

export const runtime = 'nodejs';

export async function GET(request?: Request) {
  const lang = request ? new URL(request.url).searchParams.get('lang') || 'uz' : 'uz';
  if (!['uz', 'en', 'ru'].includes(lang)) return new Response('Unsupported manuscript language', { status: 400 });
  const bytes = await generateManuscriptTemplate(lang as Language);
  return new Response(new Uint8Array(bytes).buffer, { headers: {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'Content-Disposition': `attachment; filename="AGM-${lang}-manuscript-template.docx"`,
    'Cache-Control': 'public, max-age=3600',
    'X-Manuscript-Standard': manuscriptStandard.version,
    'X-Content-Type-Options': 'nosniff',
  } });
}