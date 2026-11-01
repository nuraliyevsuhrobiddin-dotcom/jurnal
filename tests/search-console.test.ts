import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { searchConsoleConfigured, searchConsoleReport, submitSearchConsoleSitemap } from '@/lib/search-console';
import { SITE_URL } from '@/lib/site-url';

const host = new URL(SITE_URL).hostname;
const property = `sc-domain:${host}`;
const fetchMock = vi.fn();
const json = (value: unknown, status = 200) => Response.json(value, { status });
beforeEach(() => {
  vi.stubEnv('SEARCH_CONSOLE_CLIENT_ID', 'synthetic-id');
  vi.stubEnv('SEARCH_CONSOLE_CLIENT_SECRET', 'synthetic-secret');
  vi.stubEnv('SEARCH_CONSOLE_REFRESH_TOKEN', 'synthetic-token');
  vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset();
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const auth = () => fetchMock.mockResolvedValueOnce(json({ access_token: 'temporary', scope: 'https://www.googleapis.com/auth/webmasters' }));
const site = (permission = 'siteOwner', siteUrl = property) => fetchMock.mockResolvedValueOnce(json({ siteEntry: [{ siteUrl, permissionLevel: permission }] }));

describe('Search Console integration', () => {
  it('requires separate consent instead of using the Gmail send token', async () => {
    vi.stubEnv('SEARCH_CONSOLE_REFRESH_TOKEN', '');
    vi.stubEnv('GMAIL_REFRESH_TOKEN', 'mail-only');
    expect(searchConsoleConfigured()).toBe(false);
    await expect(searchConsoleReport()).rejects.toThrow('ulanmagan');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('submits only the journal sitemap to its verified property and accepts an empty HTTP 200', async () => {
    auth(); site(); fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
    const result = await submitSearchConsoleSitemap();
    expect(result).toEqual({ property, sitemap: `${SITE_URL}/sitemap.xml` });
    expect(fetchMock.mock.calls[2][0]).toBe(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/sitemaps/${encodeURIComponent(`${SITE_URL}/sitemap.xml`)}`);
    expect(fetchMock.mock.calls[2][1]).toMatchObject({ method: 'PUT', redirect: 'error' });
    expect(JSON.stringify(result)).not.toContain('temporary');
  });
  it.each(['siteUnverifiedUser', 'siteRestrictedUser'])('refuses %s access before any write', async permission => {
    auth(); site(permission);
    await expect(submitSearchConsoleSitemap()).rejects.toThrow('huquqi');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('rejects a different property and Gmail-only scopes', async () => {
    auth(); site('siteOwner', 'sc-domain:other.test');
    await expect(submitSearchConsoleSitemap()).rejects.toThrow('huquqi');
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(json({ access_token: 'temporary', scope: 'https://www.googleapis.com/auth/gmail.send' }));
    await expect(submitSearchConsoleSitemap()).rejects.toThrow('ruxsati');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('reports actual Google coverage and a missing sitemap without calling the Indexing API', async () => {
    auth(); site(); fetchMock.mockResolvedValueOnce(json({}, 404));
    fetchMock.mockResolvedValueOnce(json({ inspectionResult: { indexStatusResult: { verdict: 'NEUTRAL', coverageState: 'Discovered - currently not indexed' } } }));
    const result = await searchConsoleReport([`${SITE_URL}/uz`]);
    expect(result.sitemap).toBeNull();
    expect(result.pages[0]).toMatchObject({ verdict: 'NEUTRAL', coverageState: 'Discovered - currently not indexed' });
    expect(fetchMock.mock.calls[3][0]).toBe('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect');
    expect(JSON.parse(fetchMock.mock.calls[3][1].body)).toMatchObject({ siteUrl: property, inspectionUrl: `${SITE_URL}/uz` });
  });
  it.each(['https://other.test/uz', `${SITE_URL}/admin`, `${SITE_URL}/api/admin/articles`, `${SITE_URL}/uz?token=secret`])('does not send private or foreign URLs to Google: %s', async url => {
    await expect(searchConsoleReport([url])).rejects.toThrow('ochiq');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('does not forward credentials through redirects or include provider error bodies in errors', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: 'synthetic-secret' }, 401));
    await expect(searchConsoleReport()).rejects.toThrow('HTTP 401');
    expect(fetchMock.mock.calls[0][1].redirect).toBe('error');
  });
  it('distinguishes a disabled Google API from missing account consent', async () => {
    auth(); fetchMock.mockResolvedValueOnce(json({ error: { details: [{ reason: 'SERVICE_DISABLED' }] } }, 403));
    await expect(searchConsoleReport()).rejects.toThrow('API o‘chirilgan');
  });
});
