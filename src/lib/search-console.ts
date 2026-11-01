import { SITE_URL, siteUrl } from './site-url';
import { IntegrationError } from './integration-config';

const scope = 'https://www.googleapis.com/auth/webmasters';
const api = 'https://www.googleapis.com/webmasters/v3';

export function searchConsoleConfigured() {
  return Boolean((process.env.SEARCH_CONSOLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID)?.trim()
    && (process.env.SEARCH_CONSOLE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET)?.trim()
    && process.env.SEARCH_CONSOLE_REFRESH_TOKEN?.trim());
}

async function googleResponse(response: Response) {
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    if (error?.error?.details?.some((detail: { reason?: string }) => detail.reason === 'SERVICE_DISABLED')) throw new IntegrationError('Google Cloud loyihasida Search Console API o‘chirilgan. Google Cloud → APIs & Services orqali Search Console API’ni yoqing.', 503);
    throw new IntegrationError(`Search Console HTTP ${response.status}. Google hisobi va sayt boshqaruv huquqini tekshiring.`, 502);
  }
  return response.status === 204 ? null : response.json();
}

async function accessToken() {
  if (!searchConsoleConfigured()) throw new IntegrationError('Search Console ulanmagan. npm run connect:search-console orqali jurnal Google hisobini ulang.', 503);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
    body: new URLSearchParams({ client_id: process.env.SEARCH_CONSOLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID!,
      client_secret: process.env.SEARCH_CONSOLE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET!,
      refresh_token: process.env.SEARCH_CONSOLE_REFRESH_TOKEN!, grant_type: 'refresh_token' }),
  });
  const token = await googleResponse(response);
  if (typeof token?.access_token !== 'string' || !token.access_token) throw new IntegrationError('Google access token qaytarmadi.', 502);
  if (token.scope && !String(token.scope).split(' ').some(value => value === scope || value === scope + '.readonly')) throw new IntegrationError('Google tokenida Search Console ruxsati yo‘q. Hisobni qayta ulang.', 403);
  return token.access_token as string;
}

function googleFetch(url: string, token: string, init: RequestInit = {}) {
  return fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    redirect: 'error', signal: AbortSignal.timeout(15000) });
}

async function property(token: string) {
  const data = await googleResponse(await googleFetch(`${api}/sites`, token));
  const candidates = [`sc-domain:${new URL(SITE_URL).hostname}`, siteUrl('/')];
  const selected = candidates.map(candidate => data.siteEntry?.find((entry: { siteUrl: string; permissionLevel: string }) => entry.siteUrl === candidate && ['siteOwner', 'siteFullUser'].includes(entry.permissionLevel))).find(Boolean);
  if (!selected) throw new IntegrationError('Jurnal domeni bu Google hisobida tasdiqlanmagan yoki to‘liq boshqaruv huquqi yo‘q. Search Console hisobini tekshiring.', 403);
  return selected.siteUrl as string;
}

export async function submitSearchConsoleSitemap() {
  const token = await accessToken();
  const selected = await property(token);
  const response = await googleFetch(`${api}/sites/${encodeURIComponent(selected)}/sitemaps/${encodeURIComponent(siteUrl('/sitemap.xml'))}`, token, { method: 'PUT' });
  // Google's successful PUT may have an empty body with either 200 or 204.
  if (!response.ok) await googleResponse(response);
  await response.body?.cancel();
  return { property: selected, sitemap: siteUrl('/sitemap.xml') };
}

export async function searchConsoleReport(urls: string[] = []) {
  // Only public URLs on this journal's origin may be sent for inspection.
  for (const value of urls) {
    const url = new URL(value);
    if (url.origin !== SITE_URL || url.username || url.password || !/^\/(?:uz|en|ru)(?:\/article\/[^/]+)?\/?$/.test(url.pathname) || url.search || url.hash) throw new IntegrationError('Faqat jurnalning ochiq bosh sahifa yoki maqola manzilini tekshirish mumkin.', 400);
  }
  if (urls.length > 4) throw new IntegrationError('Bir so‘rovda ko‘pi bilan 4 ta sahifani tekshiring.', 400);
  const token = await accessToken();
  const selected = await property(token);
  const sitemapResponse = await googleFetch(`${api}/sites/${encodeURIComponent(selected)}/sitemaps/${encodeURIComponent(siteUrl('/sitemap.xml'))}`, token);
  const sitemap = sitemapResponse.status === 404 ? null : await googleResponse(sitemapResponse);
  if (sitemapResponse.status === 404) await sitemapResponse.body?.cancel();
  const pages = await Promise.all(urls.map(async url => {
    const data = await googleResponse(await googleFetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', token, {
      method: 'POST', body: JSON.stringify({ inspectionUrl: url, siteUrl: selected, languageCode: 'en-US' }),
    }));
    const result = data.inspectionResult?.indexStatusResult;
    return { url, verdict: result?.verdict || 'VERDICT_UNSPECIFIED', coverageState: result?.coverageState || '',
      lastCrawlTime: result?.lastCrawlTime || null, googleCanonical: result?.googleCanonical || null };
  }));
  return { property: selected, sitemap: sitemap ? { url: siteUrl('/sitemap.xml'), pending: Boolean(sitemap.isPending),
    errors: Number(sitemap.errors || 0), warnings: Number(sitemap.warnings || 0), lastDownloaded: sitemap.lastDownloaded || null } : null, pages };
}
