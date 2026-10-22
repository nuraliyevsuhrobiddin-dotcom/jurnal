import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';
import type { Article } from '@/types/journal';
import { trackingUrl, readTrackingToken, submissionReference } from '@/lib/submission-tracking';
import { editorialMessages, saveEditorialMessage } from '@/lib/editorial-messages';
import { GET as track } from '@/app/track/[token]/route';
import { GET as correspondence, POST as sendNote } from '@/app/api/admin/articles/[id]/correspondence/route';
import { listNotifications, queueNotification, deliverNotification, drainNotificationQueue } from '@/lib/notifications';

const state = vi.hoisted(() => ({ denied: false, article: null as Article | null, callbacks: [] as (() => Promise<void>)[] }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: () => null }));
vi.mock('@/lib/admin-access', () => ({ adminAccess: async () => state.denied ? Response.json({ error: 'Unauthorized' }, { status: 401 }) : null }));
vi.mock('next/server', async importOriginal => ({ ...await importOriginal<typeof import('next/server')>(), after: (callback: () => Promise<void>) => { state.callbacks.push(callback); } }));
vi.mock('@/lib/db', () => ({
  getArticleById: async (id: string) => id === state.article?.id ? state.article : null,
  getAllCertificatesAdmin: async () => [],
  getJournalSettings: async () => ({ contact_email: 'editor@example.org' }),
  updateArticleStatus: async (_id: string, status: Article['status']) => { state.article!.status = status; state.article!.updated_at = new Date().toISOString(); return state.article; },
  logAudit: async () => {},
}));
const id = '88888888-8888-4888-a888-888888888888';
const messageId = '99999999-9999-4999-a999-999999999999';
let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'agm-editorial-'));
  vi.stubEnv('JOURNAL_DATA_DIR', directory); vi.stubEnv('TRACKING_SECRET', 'synthetic-tracking-test-secret');
  vi.stubEnv('MAIL_PROVIDER', 'resend'); vi.stubEnv('RESEND_API_KEY', 'test'); vi.stubEnv('MAIL_FROM', 'editor@example.org');
  state.denied = false; state.callbacks = [];
  state.article = { id, title_uz: 'Research <title>', original_language: 'uz', status: 'draft', created_at: '2026-10-20T00:00:00Z', updated_at: '2026-10-20T00:00:00Z', submission_notes: 'CONFIDENTIAL INTERNAL NOTE', manuscript_file_url: '/api/admin/manuscripts/11111111-1111-4111-a111-111111111111', authors: [{ full_name: 'Author', email: 'author@example.org', is_corresponding: true }] } as Article;
});
afterEach(async () => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); await rm(directory, { recursive: true, force: true }); });

describe('Private submission tracking', () => {
  it('rejects forged, expired, and changed-secret links', () => {
    const now = Date.now();
    const token = trackingUrl(id, now).split('/').pop()!;
    expect(readTrackingToken(token, now)).toBe(id);
    expect(readTrackingToken(token.replace(id, '77777777-7777-4777-a777-777777777777'), now)).toBeNull();
    expect(readTrackingToken(token, now + 181 * 86400000)).toBeNull();
    expect(readTrackingToken('x'.repeat(201))).toBeNull();
    vi.stubEnv('TRACKING_SECRET', 'changed-secret'); expect(readTrackingToken(token)).toBeNull();
  });
  it('shows only safe tracking details and escaped editorial text', async () => {
    await saveEditorialMessage({ id: messageId, article_id: id, kind: 'note', body: '<script>alert(1)</script>', created_at: new Date().toISOString() });
    const token = trackingUrl(id).split('/').pop()!;
    const response = await track(new Request('https://example.org'), { params: Promise.resolve({ token }) });
    const text = await response.text();
    expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(response.headers.get('x-robots-tag')).toContain('noindex');
    expect(text).toContain('&lt;script&gt;'); expect(text).not.toContain('<script>');
    expect(text).not.toContain('author@example.org'); expect(text).not.toContain('CONFIDENTIAL'); expect(text).not.toContain('/api/admin/manuscripts');
    expect(submissionReference(state.article!)).toBe('AGM-SUB-11111111');
    expect((await track(new Request('https://example.org'), { params: Promise.resolve({ token: 'invalid' }) })).status).toBe(404);
  });
});

describe('Editorial correspondence', () => {
  const context = () => ({ params: Promise.resolve({ id }) });
  const request = (kind = 'revision_requested', body = 'Please clarify the methodology and sources.') => new NextRequest(`http://localhost/api/admin/articles/${id}/correspondence`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' }, body: JSON.stringify({ id: messageId, kind, body }) });
  it('requires admin access and prevents cross-origin writes', async () => {
    state.denied = true; expect((await correspondence(new Request('http://localhost'), context())).status).toBe(401);
    expect((await sendNote(request(), context())).status).toBe(401);
    state.denied = false;
    const crossOrigin = request(); crossOrigin.headers.set('origin', 'https://evil.example');
    expect((await sendNote(crossOrigin, context())).status).toBe(403);
  });
  it('stores a revision request once and queues one author message on retries', async () => {
    expect((await sendNote(request(), context())).status).toBe(200);
    expect(state.article!.status).toBe('under_review');
    expect((await sendNote(request(), context())).status).toBe(200);
    expect(await editorialMessages(id)).toHaveLength(1);
    const outbox = await listNotifications(); expect(outbox).toHaveLength(1);
    expect(outbox[0].recipient).toBe('author@example.org'); expect(outbox[0].body).toContain('/track/');
    const token = trackingUrl(id).split('/').pop()!;
    expect(await (await track(new Request('http://localhost'), { params: Promise.resolve({ token }) })).text()).toContain('Revision requested');
  });
  it('does not move a published article back to review', async () => {
    state.article!.status = 'published';
    expect((await sendNote(request(), context())).status).toBe(409);
    expect(await editorialMessages(id)).toHaveLength(0);
  });
});

describe('Email recovery', () => {
  it('drains more than three queued messages', async () => {
    for (let index = 0; index < 8; index++) await queueNotification({ recipient: 'author@example.org', subject: `Test ${index}`, body: 'Synthetic' });
    const fetcher = vi.fn(async () => Response.json({ id: 'sent' })); vi.stubGlobal('fetch', fetcher);
    expect(await drainNotificationQueue()).toMatchObject({ attempted: 8, sent: 8 }); expect(fetcher).toHaveBeenCalledTimes(8);
  });
  it('backs off failed messages and sends one non-recursive administrator alert', async () => {
    const original = await queueNotification({ recipient: 'author@example.org', subject: 'Original', body: 'Private manuscript contents' });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })));
    expect(await deliverNotification(original)).toBe(false);
    let items = await listNotifications();
    const failed = items.find(item => item.id === original.id)!;
    expect(Date.parse(failed.next_attempt_at!)).toBeGreaterThan(Date.now());
    const alert = items.find(item => item.kind === 'admin_alert')!;
    expect(alert.recipient).toBe('editor@example.org'); expect(alert.body).not.toContain('Private manuscript contents');
    expect((await listNotifications(true)).map(item => item.id)).not.toContain(original.id);
    await deliverNotification(failed); await deliverNotification(alert);
    items = await listNotifications(); expect(items.filter(item => item.kind === 'admin_alert')).toHaveLength(1);
  });
});
