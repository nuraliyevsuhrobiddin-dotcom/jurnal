import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Article, Certificate } from '@/types/journal';
import { queueArticleNotifications, publicationAttachments } from '@/lib/publication-notifications';
import { deliverNotification, listNotifications, mailConfigured, queueNotification } from '@/lib/notifications';
import { gmailMessage } from '@/lib/gmail';

const state = vi.hoisted(() => ({ article: null as Article | null, certificates: [] as Certificate[] }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: () => null }));
vi.mock('@/lib/db', () => ({
  getAllCertificatesAdmin: async () => [...state.certificates],
  createCertificate: async (data: Record<string, unknown>) => {
    const cert = { ...data, id: data.issuance_id, certificate_number: `CERT-${state.certificates.length}`, status: 'valid' } as unknown as Certificate;
    state.certificates.push(cert); return cert;
  },
  getArticleById: async () => state.article,
  getCertificateByCode: async (code: string) => state.certificates.find(c => c.certificate_number === code),
  getJournalSettings: async () => ({}),
}));
vi.mock('@/lib/pdf/storage', () => ({ readArticlePdf: async () => Buffer.from('%PDF-article') }));
vi.mock('@/lib/pdf/generator', () => ({ generateCertificatePdf: async () => Buffer.from('%PDF-certificate') }));

let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'agm-publication-mail-'));
  vi.stubEnv('JOURNAL_DATA_DIR', directory); vi.stubEnv('MAIL_PROVIDER', 'resend');
  vi.stubEnv('MAIL_FROM', 'journal@example.org'); vi.stubEnv('RESEND_API_KEY', 'test');
  state.certificates = [];
  state.article = {
    id: 'article-1', slug: 'science', status: 'published', title_uz: 'Ilmiy maqola', original_language: 'uz',
    publication_date: '2026-10-22', issue: { volume: 1, issue_number: 2, year: 2026 },
    authors: [
      { id: 'author-1', full_name: 'Author One', email: 'one@example.org', is_corresponding: true },
      { id: 'author-2', full_name: 'Author Two', email: 'two@example.org' },
      { id: 'author-3', full_name: 'Author Three' },
    ],
  } as Article;
});
afterEach(async () => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); await rm(directory, { recursive: true, force: true }); });

describe('Publication delivery', () => {
  it('issues each author a certificate and queues personal PDFs, falling back to the corresponding author', async () => {
    const article = state.article!;
    const items = await queueArticleNotifications({ ...article, status: 'draft' }, article);
    expect(state.certificates).toHaveLength(3);
    expect(items.map(n => n.recipient)).toEqual(['one@example.org', 'two@example.org', 'one@example.org']);
    expect(items[2].body).toContain('Author Three');
    expect(await queueArticleNotifications(article, article)).toEqual([]);
    expect(state.certificates).toHaveLength(3);
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({ id: 'sent' })); vi.stubGlobal('fetch', fetcher);
    expect(await deliverNotification(items[0])).toBe(true);
    const payload = JSON.parse(fetcher.mock.calls[0][1]!.body as string);
    expect(payload.attachments).toHaveLength(2);
    expect(Buffer.from(payload.attachments[0].content, 'base64').toString()).toBe('%PDF-article');
    expect(Buffer.from(payload.attachments[1].content, 'base64').toString()).toBe('%PDF-certificate');
  });
  it('keeps certificates available when no author has an email', async () => {
    state.article!.authors!.forEach(a => { a.email = undefined; });
    expect(await queueArticleNotifications(state.article!, state.article!)).toEqual([]);
    expect(state.certificates).toHaveLength(3);
  });
  it('blocks stale publication messages after withdrawal or certificate revocation', async () => {
    const [item] = await queueArticleNotifications(state.article!, state.article!);
    state.article!.status = 'withdrawn';
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    expect(await deliverNotification(item)).toBe(false); expect(fetcher).not.toHaveBeenCalled();
    state.article!.status = 'published'; state.certificates[0].status = 'revoked';
    await expect(publicationAttachments(item.publication!)).rejects.toThrow('Sertifikat');
    expect(await queueArticleNotifications(state.article!, state.article!)).toEqual([]);
    expect(state.certificates).toHaveLength(3);
  });
});

describe('Gmail transport', () => {
  function configure() {
    vi.stubEnv('MAIL_PROVIDER', 'gmail'); vi.stubEnv('GMAIL_SENDER', 'journal@gmail.com');
    vi.stubEnv('GMAIL_CLIENT_ID', 'client'); vi.stubEnv('GMAIL_CLIENT_SECRET', 'secret'); vi.stubEnv('GMAIL_REFRESH_TOKEN', 'refresh');
  }
  it('sends a UTF-8 MIME message with PDFs through the Gmail API', async () => {
    configure(); expect(mailConfigured()).toBe(true);
    const [item] = await queueArticleNotifications(state.article!, state.article!);
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ access_token: 'access' })).mockResolvedValueOnce(Response.json({ id: 'gmail-id' }));
    vi.stubGlobal('fetch', fetcher);
    expect(await deliverNotification(item)).toBe(true);
    expect(fetcher.mock.calls[1][0]).toBe('https://gmail.googleapis.com/gmail/v1/users/me/messages/send');
    const payload = JSON.parse(fetcher.mock.calls[1][1]!.body as string);
    const mime = Buffer.from(payload.raw, 'base64url').toString();
    expect(mime).toContain('From: journal@gmail.com'); expect(mime).toContain('Subject: =?UTF-8?B?');
    expect(mime.match(/Content-Disposition: attachment/g)).toHaveLength(2);
    expect((await listNotifications()).find(n => n.id === item.id)?.status).toBe('sent');
  });
  it('does not repeat a possibly accepted Gmail send after a timeout or concurrent request', async () => {
    configure();
    const item = await queueNotification({ recipient: 'one@example.org', subject: 'Test', body: 'Text' });
    const fetcher = vi.fn<typeof fetch>(async input => {
      if (String(input).includes('oauth2')) return Response.json({ access_token: 'access' });
      throw new Error('network interrupted');
    });
    vi.stubGlobal('fetch', fetcher);
    await Promise.all([deliverNotification(item), deliverNotification(item)]);
    expect(fetcher.mock.calls.filter(call => String(call[0]).includes('messages/send'))).toHaveLength(1);
    expect((await listNotifications())[0].status).toBe('unknown');
    await deliverNotification(item);
    expect(fetcher.mock.calls.filter(call => String(call[0]).includes('messages/send'))).toHaveLength(1);
  });
  it('rejects header injection and incomplete Gmail configuration', () => {
    configure(); vi.stubEnv('GMAIL_REFRESH_TOKEN', ''); expect(mailConfigured()).toBe(false);
    expect(() => gmailMessage({ id: 'id', recipient: 'one@example.org\r\nBcc: victim@example.org', subject: 'Test', body: 'Text' }, [])).toThrow();
  });
});
