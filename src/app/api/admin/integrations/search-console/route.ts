import { NextRequest, NextResponse } from 'next/server';
import { adminAccess } from '@/lib/admin-access';
import { protectRequest } from '@/lib/request-limit';
import { boundedBody, BodyLimitError } from '@/lib/bounded-body';
import { IntegrationError } from '@/lib/integration-config';
import { searchConsoleReport, submitSearchConsoleSitemap } from '@/lib/search-console';
import { getPublishedArticles, logAudit } from '@/lib/db';
import { articleUrl } from '@/lib/scholarly-feeds';
import { siteUrl } from '@/lib/site-url';

export const maxDuration = 60;
export async function POST(request: NextRequest) {
  const denied = await adminAccess(['owner']); if (denied) return denied;
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  const limited = await protectRequest(request, 'search-console', 5, 3600); if (limited) return limited;
  try {
    const input = JSON.parse(new TextDecoder().decode(await boundedBody(request, 1024)));
    if (!input || !['status', 'submit_sitemap'].includes(input.action) || Object.keys(input).some(key => key !== 'action')) return NextResponse.json({ error: 'Noto‘g‘ri amal.' }, { status: 400 });
    if (input.action === 'submit_sitemap') {
      const result = await submitSearchConsoleSitemap();
      await logAudit('GOOGLE_SITEMAP_SUBMIT', 'discovery', result.property, { sitemap: result.sitemap });
      return NextResponse.json({ message: 'Sitemap Google Search Console’ga yuborildi. Bu hali sahifalar indekslanganini bildirmaydi.' }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    const articles = await getPublishedArticles({ limit: 3 });
    const report = await searchConsoleReport([siteUrl('/uz'), ...articles.map(article => articleUrl(article))]);
    return NextResponse.json({ report, message: 'Google indeksidagi holat tekshirildi. URL Inspection API yangi crawl so‘rovi yubormaydi.' }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const status = error instanceof IntegrationError ? error.status : error instanceof BodyLimitError ? 413 : error instanceof SyntaxError ? 400 : 503;
    return NextResponse.json({ error: error instanceof IntegrationError ? error.message : 'Google tekshiruvi bajarilmadi.' }, { status, headers: { 'Cache-Control': 'private, no-store' } });
  }
}
