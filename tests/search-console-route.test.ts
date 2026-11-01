import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { POST } from '@/app/api/admin/integrations/search-console/route';
import { adminAccess } from '@/lib/admin-access';
import { protectRequest } from '@/lib/request-limit';
import { searchConsoleReport, submitSearchConsoleSitemap } from '@/lib/search-console';
import { getPublishedArticles, logAudit } from '@/lib/db';
import { journalStore } from '@/lib/data-store';

vi.mock('@/lib/admin-access', () => ({ adminAccess: vi.fn() }));
vi.mock('@/lib/request-limit', () => ({ protectRequest: vi.fn() }));
vi.mock('@/lib/search-console', () => ({ searchConsoleReport: vi.fn(), submitSearchConsoleSitemap: vi.fn() }));
vi.mock('@/lib/db', () => ({ getPublishedArticles: vi.fn(), logAudit: vi.fn() }));
const request = (body: string, origin = 'http://localhost') => new NextRequest('http://localhost/api/admin/integrations/search-console', { method: 'POST', headers: { origin }, body });
beforeEach(() => {
  vi.resetAllMocks(); vi.mocked(adminAccess).mockResolvedValue(null); vi.mocked(protectRequest).mockResolvedValue(null);
  vi.mocked(getPublishedArticles).mockResolvedValue([journalStore.articles[0]]);
});

describe('Search Console admin operations', () => {
  it('requires owner authorization before calling Google', async () => {
    vi.mocked(adminAccess).mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 403 }));
    expect((await POST(request('{"action":"submit_sitemap"}'))).status).toBe(403);
    expect(adminAccess).toHaveBeenCalledWith(['owner']);
    expect(submitSearchConsoleSitemap).not.toHaveBeenCalled();
  });
  it('blocks cross-origin requests and rate-limited requests', async () => {
    expect((await POST(request('{"action":"submit_sitemap"}', 'https://other.test'))).status).toBe(403);
    vi.mocked(protectRequest).mockResolvedValue(NextResponse.json({ error: 'Limited' }, { status: 429 }));
    expect((await POST(request('{"action":"submit_sitemap"}'))).status).toBe(429);
    expect(submitSearchConsoleSitemap).not.toHaveBeenCalled();
  });
  it.each(['{}', '{', '{"action":"index"}', '{"action":"submit_sitemap","url":"https://other.test"}'])('rejects unsupported actions or client URLs: %s', async body => {
    expect((await POST(request(body))).status).toBe(400);
    expect(submitSearchConsoleSitemap).not.toHaveBeenCalled();
    expect(searchConsoleReport).not.toHaveBeenCalled();
  });
  it('audits a successful sitemap submission without claiming indexing', async () => {
    vi.mocked(submitSearchConsoleSitemap).mockResolvedValue({ property: 'sc-domain:agmjoural.uz', sitemap: 'https://agmjoural.uz/sitemap.xml' });
    const response = await POST(request('{"action":"submit_sitemap"}'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect((await response.json()).message).toContain('hali sahifalar indekslanganini bildirmaydi');
    expect(logAudit).toHaveBeenCalledWith('GOOGLE_SITEMAP_SUBMIT', 'discovery', 'sc-domain:agmjoural.uz', { sitemap: 'https://agmjoural.uz/sitemap.xml' });
  });
  it('only inspects known public journal pages', async () => {
    vi.mocked(searchConsoleReport).mockResolvedValue({ property: 'sc-domain:agmjoural.uz', sitemap: null, pages: [] });
    const response = await POST(request('{"action":"status"}'));
    expect(response.status).toBe(200);
    expect(getPublishedArticles).toHaveBeenCalledWith({ limit: 3 });
    expect(searchConsoleReport).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('/uz'), expect.stringContaining(`/article/${journalStore.articles[0].slug}`)]));
    expect(submitSearchConsoleSitemap).not.toHaveBeenCalled();
  });
});
