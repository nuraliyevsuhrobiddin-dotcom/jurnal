import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createServerClient } from '@/lib/supabase/server';
import { consumeLimit, protectRequest, requestIdentity } from '@/lib/request-limit';
import { boundedBody } from '@/lib/bounded-body';
import { assertPublicationReady } from '@/lib/publication-ready';
import { readArticlePdf } from '@/lib/pdf/storage';
import { journalStore } from '@/lib/data-store';
import { distinctEditorialMembers } from '@/lib/editorial-members';
import { queueNotification, listNotifications, deliverNotification } from '@/lib/notifications';
import { getArticlePage } from '@/lib/article-page';

vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn(() => null), isServerSupabaseConfigured: false }));
vi.mock('@/lib/pdf/storage', () => ({ readArticlePdf: vi.fn() }));

beforeEach(() => { vi.mocked(createServerClient).mockReturnValue(null); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('Abuse protection', () => {
  it('limits attempts, expires the window, and separates identities', async () => {
    vi.useFakeTimers();
    const scope = crypto.randomUUID();
    expect(await consumeLimit(scope, 'a', 2, 60)).toBe(0);
    expect(await consumeLimit(scope, 'a', 2, 60)).toBe(0);
    expect(await consumeLimit(scope, 'a', 2, 60)).toBe(60);
    expect(await consumeLimit(scope, 'b', 2, 60)).toBe(0);
    vi.advanceTimersByTime(60001);
    expect(await consumeLimit(scope, 'a', 2, 60)).toBe(0);
  });
  it('does not trust client-supplied forwarding headers on standalone hosts', () => {
    vi.stubEnv('VERCEL', ''); vi.stubEnv('TRUST_PROXY_IP', '');
    const request = new NextRequest('http://localhost', { headers: { 'x-forwarded-for': 'spoofed', 'x-real-ip': 'spoofed' } });
    expect(requestIdentity(request)).toBe('shared');
  });
  it('uses the shared atomic RPC and fails closed when protection is unavailable', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 40, error: null });
    vi.mocked(createServerClient).mockReturnValue({ rpc } as unknown as NonNullable<ReturnType<typeof createServerClient>>);
    const request = new NextRequest('http://localhost');
    const limited = await protectRequest(request, 'login', 5);
    expect(limited?.status).toBe(429); expect(limited?.headers.get('Retry-After')).toBe('40');
    rpc.mockResolvedValue({ data: null, error: { message: 'missing function' } });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await protectRequest(request, 'login', 5))?.status).toBe(503);
    log.mockRestore();
  });
  it('rejects oversized chunked bodies even without Content-Length', async () => {
    const request = new Request('http://localhost', { method: 'POST', body: '1234567890' });
    await expect(boundedBody(request, 5)).rejects.toThrow('Request too large');
    expect(new TextDecoder().decode(await boundedBody(new Request('http://localhost', { method: 'POST', body: '123' }), 5))).toBe('123');
  });
});

describe('Publication readiness', () => {
  const article = { ...journalStore.articles[0], pdf_url: '/api/articles/test/pdf', pdf_file_size: 1000, issue: journalStore.issues[0] };
  it('blocks publication when English discovery metadata is absent or whitespace-only', async () => {
    await expect(assertPublicationReady({ ...article, title_en: '  ' })).rejects.toThrow('Inglizcha sarlavha');
    await expect(assertPublicationReady({ ...article, abstract_en: undefined })).rejects.toThrow('Inglizcha annotatsiya');
    await expect(assertPublicationReady({ ...article, keywords_en: [] })).rejects.toThrow('Inglizcha kalit');
    await expect(assertPublicationReady({ ...article, keywords_en: ['  '] })).rejects.toThrow();
  });
  it('rejects missing issue, author metadata, and stored manuscript', async () => {
    await expect(assertPublicationReady({ ...article, issue_id: undefined })).rejects.toThrow();
    await expect(assertPublicationReady({ ...article, authors: [] })).rejects.toThrow();
    vi.mocked(readArticlePdf).mockResolvedValue(null);
    await expect(assertPublicationReady(article)).rejects.toThrow('topilmadi');
  });
  it('rejects cover-only/corrupt PDFs and permits a readable full PDF', async () => {
    const document = await PDFDocument.create(); document.addPage(); document.setKeywords(['AGM_METADATA_ONLY']);
    vi.mocked(readArticlePdf).mockResolvedValue(await document.save());
    await expect(assertPublicationReady(article)).rejects.toThrow();
    vi.mocked(readArticlePdf).mockResolvedValue(new Uint8Array([1, 2, 3]));
    await expect(assertPublicationReady(article)).rejects.toThrow();
    document.setKeywords(['AGM_FULL_ARTICLE_V2']); vi.mocked(readArticlePdf).mockResolvedValue(await document.save());
    await expect(assertPublicationReady(article)).rejects.toThrow('betlari');
    await expect(assertPublicationReady({ ...article, page_first: 1, page_last: 1 })).resolves.toBeUndefined();
  });
});

describe('Catalog and editorial records', () => {
  it('collapses repeated records without hiding different roles or affiliations', () => {
    const member = journalStore.editorialBoard[0];
    const rows = distinctEditorialMembers([member, { ...member, id: 'duplicate', created_at: 'later', order_index: 99 }, { ...member, affiliation: 'Another university' }]);
    expect(rows).toHaveLength(2);
  });
  it('filters before pagination and keeps drafts private', async () => {
    const saved = journalStore.articles;
    journalStore.articles = Array.from({ length: 27 }, (_, index) => ({ ...saved[0], id: `page-${index}`, status: index === 26 ? 'draft' : 'published' }));
    try {
      const first = await getArticlePage({ page: '1' }); const second = await getArticlePage({ page: '2' });
      expect(first.total).toBe(26); expect(first.articles).toHaveLength(12);
      expect(second.articles).toHaveLength(12);
      expect(first.articles.some(a => second.articles.some(b => a.id === b.id))).toBe(false);
      expect((await getArticlePage({ page: '-2' })).page).toBe(1);
      expect((await getArticlePage({ query: 'no-match-anywhere' })).total).toBe(0);
    } finally { journalStore.articles = saved; }
  });
});

describe('Durable email receipts', () => {
  it('retains pending receipts without credentials and retries provider failures', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'agm-mail-'));
    vi.stubEnv('JOURNAL_DATA_DIR', directory); vi.stubEnv('RESEND_API_KEY', ''); vi.stubEnv('MAIL_FROM', '');
    try {
      const notification = await queueNotification({ recipient: 'author@example.org', subject: 'Receipt', body: 'Reference: test' });
      const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
      expect(await deliverNotification(notification)).toBe(false); expect(fetcher).not.toHaveBeenCalled();
      expect((await listNotifications())[0].status).toBe('pending');
      vi.stubEnv('RESEND_API_KEY', 'test-key'); vi.stubEnv('MAIL_FROM', 'journal@example.org');
      fetcher.mockResolvedValueOnce(new Response('{}', { status: 503 }));
      expect(await deliverNotification(notification)).toBe(false);
      const pending = (await listNotifications())[0]; expect(pending.attempts).toBe(1);
      fetcher.mockResolvedValueOnce(new Response('{"id":"mail-id"}', { status: 200 }));
      expect(await deliverNotification(pending)).toBe(true);
      expect((await listNotifications())[0].status).toBe('sent');
      expect(fetcher.mock.calls[0][1].headers['Idempotency-Key']).toBe(notification.id);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
