import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { orcidConfig, IntegrationError, providerJson } from './integration-config';
import { siteUrl } from './site-url';
import type { Language } from '@/types/journal';

export const orcidStateCookie = 'agm-orcid-state';
export const orcidProofCookie = 'agm-orcid-proof';
export const orcidCookieOptions = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/' };

export function validOrcid(id: string) {
  if (!/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(id)) return false;
  const digits = id.replace(/-/g, '');
  let total = 0;
  for (const digit of digits.slice(0, 15)) total = (total + Number(digit)) * 2;
  const check = (12 - total % 11) % 11;
  return digits[15] === (check === 10 ? 'X' : String(check));
}

function sign(purpose: string, payload: object) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', orcidConfig().secret).update(`${purpose}:${data}`).digest('base64url');
  return `${data}.${signature}`;
}

function verify<T extends { exp: number }>(purpose: string, cookie?: string): T | null {
  try {
    if (!cookie || cookie.length > 4096) return null;
    const parts = cookie.split('.'); if (parts.length !== 2) return null;
    const [data, signature] = parts;
    const expected = createHmac('sha256', orcidConfig().secret).update(`${purpose}:${data}`).digest('base64url');
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as T;
    if (!Number.isSafeInteger(payload.exp) || payload.exp <= Date.now()) return null;
    return payload;
  } catch { return null; }
}

interface OAuthState { nonce: string; lang: Language; exp: number }
export interface OrcidProof { id: string; name: string; environment: string; exp: number }

export function startOrcid(lang: Language) {
  const config = orcidConfig();
  const nonce = randomBytes(32).toString('base64url');
  const state = sign('orcid-state', { nonce, lang, exp: Date.now() + 600000 });
  const url = new URL('/oauth/authorize', config.base);
  url.search = new URLSearchParams({ client_id: config.clientId, response_type: 'code', scope: '/authenticate', redirect_uri: siteUrl('/api/orcid/callback'), state: nonce }).toString();
  return { state, url: url.toString() };
}

export function readOrcidState(cookie?: string) {
  const state = verify<OAuthState>('orcid-state', cookie);
  return state && ['uz', 'en', 'ru'].includes(state.lang) && typeof state.nonce === 'string' ? state : null;
}

export function readOrcidProof(cookie?: string) {
  const proof = verify<OrcidProof>('orcid-proof', cookie);
  try {
    return proof && typeof proof.id === 'string' && validOrcid(proof.id) && typeof proof.name === 'string' && proof.environment === orcidConfig().environment ? proof : null;
  } catch { return null; }
}

export async function finishOrcid(code: string) {
  const config = orcidConfig();
  const token = await providerJson(await fetch(`${config.base}/oauth/token`, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, grant_type: 'authorization_code', code, redirect_uri: siteUrl('/api/orcid/callback') }),
  }));
  if (typeof token.orcid !== 'string' || !validOrcid(token.orcid) || typeof token.access_token !== 'string' || !token.access_token || !String(token.scope).split(' ').includes('/authenticate')) throw new IntegrationError('ORCID tasdiqlash javobi noto‘g‘ri.', 502);
  // The access token is never persisted or returned to the browser.
  return sign('orcid-proof', { id: token.orcid, name: typeof token.name === 'string' ? token.name.slice(0, 150) : '', environment: config.environment, exp: Date.now() + 3600000 });
}
