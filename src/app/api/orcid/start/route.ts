import { NextRequest, NextResponse } from 'next/server';
import { orcidCookieOptions, orcidStateCookie, startOrcid } from '@/lib/orcid-auth';
import { IntegrationError } from '@/lib/integration-config';
import { protectRequest } from '@/lib/request-limit';

export async function GET(request: NextRequest) {
  const limited = await protectRequest(request, 'orcid-start', 15, 60); if (limited) return limited;
  const requested = request.nextUrl.searchParams.get('lang');
  const lang = requested === 'uz' || requested === 'ru' ? requested : 'en';
  try {
    const flow = startOrcid(lang);
    const response = NextResponse.redirect(flow.url);
    response.cookies.set(orcidStateCookie, flow.state, { ...orcidCookieOptions, maxAge: 600 });
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('Referrer-Policy', 'no-referrer');
    return response;
  } catch (error) { return NextResponse.json({ error: error instanceof IntegrationError ? error.message : 'ORCID ulanmagan.' }, { status: 503 }); }
}
