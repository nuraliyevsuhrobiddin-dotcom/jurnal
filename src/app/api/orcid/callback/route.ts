import { NextRequest, NextResponse } from 'next/server';
import { finishOrcid, readOrcidState, orcidCookieOptions, orcidProofCookie, orcidStateCookie } from '@/lib/orcid-auth';
import { siteUrl } from '@/lib/site-url';

export async function GET(request: NextRequest) {
  const state = readOrcidState(request.cookies.get(orcidStateCookie)?.value);
  const supplied = request.nextUrl.searchParams.get('state');
  const code = request.nextUrl.searchParams.get('code');
  let proof: string | null = null;
  if (state && supplied === state.nonce && code && code.length <= 2048 && !request.nextUrl.searchParams.has('error')) {
    try { proof = await finishOrcid(code); } catch { /* Return a safe error without provider tokens. */ }
  }
  const response = NextResponse.redirect(siteUrl(`/${state?.lang || 'en'}/submit?orcid=${proof ? 'connected' : 'failed'}`));
  response.cookies.set(orcidStateCookie, '', { ...orcidCookieOptions, maxAge: 0 });
  if (proof) response.cookies.set(orcidProofCookie, proof, { ...orcidCookieOptions, maxAge: 3600 });
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
