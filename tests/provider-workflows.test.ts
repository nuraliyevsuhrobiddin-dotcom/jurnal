import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import JSZip from 'jszip';
import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { journalStore } from '@/lib/data-store';
import { submitCrossref, prepareZenodoDraft } from '@/lib/scholarly-deposits';
import { getIntegrationJob } from '@/lib/integration-jobs';
import { crossrefConfig, zenodoConfig, orcidConfig } from '@/lib/integration-config';
import { finishOrcid, startOrcid, readOrcidState, readOrcidProof, validOrcid, orcidStateCookie } from '@/lib/orcid-auth';
import { GET as callback } from '@/app/api/orcid/callback/route';
import { GET as notificationWorker } from '@/app/api/cron/notifications/route';
import { queueArticleStatusNotification } from '@/lib/article-status-notifications';
import { listNotifications, queueNotificationOnce } from '@/lib/notifications';
import { archivePackage } from '@/lib/archive-package';
import { checkIntegrations } from '@/lib/integration-checks';
import { readArticlePdf } from '@/lib/pdf/storage';

vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn(() => null) }));
vi.mock('@/lib/pdf/storage', () => ({ readArticlePdf: vi.fn(async () => new Uint8Array(Buffer.from('%PDF-synthetic-test'))) }));

let directory: string;
const settings = { ...journalStore.settings, doi_prefix: '10.5555', issn_online: '2049-3630', publisher: 'Test Publisher', contact_email: 'editor@example.org' };
const article = { ...journalStore.articles[0], status: 'published' as const, doi: '10.5555/fixture', publication_date: '2026-10-20', updated_at: '2026-10-20T12:00:00Z', title_en: 'Synthetic integration fixture', abstract_en: 'Synthetic abstract for provider contract testing.', keywords_en: ['fixture'] };

beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'agm-integrations-'));
  vi.stubEnv('JOURNAL_DATA_DIR', directory);
  vi.stubEnv('INTEGRATION_PRODUCTION_ENABLED', 'false');
  vi.stubEnv('ORCID_PRODUCTION_ENABLED', 'false');
  vi.stubEnv('CROSSREF_MODE', 'test'); vi.stubEnv('ZENODO_MODE', 'sandbox'); vi.stubEnv('ORCID_MODE', 'sandbox');
  vi.stubEnv('CROSSREF_USERNAME', 'test-user'); vi.stubEnv('CROSSREF_PASSWORD', 'synthetic-password');
  vi.stubEnv('ZENODO_ACCESS_TOKEN', 'synthetic-token');
  vi.stubEnv('ORCID_CLIENT_ID', 'APP-test'); vi.stubEnv('ORCID_CLIENT_SECRET', 'synthetic-client-secret');
  vi.stubEnv('ORCID_COOKIE_SECRET', 'synthetic-cookie-secret-at-least-32-characters');
  vi.stubEnv('MAIL_FROM', 'Test <sender@example.org>'); vi.stubEnv('RESEND_API_KEY', 'synthetic-resend');
  vi.clearAllMocks();
});
afterEach(async () => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); await rm(directory, { recursive: true, force: true }); });

describe('Sandbox deposit workflows', () => {
  it('fails closed for absent credentials, invalid modes and accidental production activation', () => {
    vi.stubEnv('CROSSREF_USERNAME', ''); expect(() => crossrefConfig()).toThrow('CROSSREF_USERNAME');
    vi.stubEnv('ZENODO_MODE', 'some-untrusted-host'); expect(() => zenodoConfig()).toThrow('noto‘g‘ri');
    vi.stubEnv('CROSSREF_MODE', 'production'); expect(() => crossrefConfig()).toThrow('Production');
  });
  it('submits Crossref multipart to the test endpoint and records queue acceptance only', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response('<h2>SUCCESS</h2>Your batch submission was successfully received.'));
    vi.stubGlobal('fetch', fetcher);
    const result = await submitCrossref(article, settings);
    expect(fetcher.mock.calls[0][0]).toBe('https://test.crossref.org/servlet/deposit');
    const form = (fetcher.mock.calls[0] as unknown as [string, RequestInit])[1].body as FormData;
    expect(form.get('operation')).toBe('doMDUpload'); expect(form.get('fname')).toBeInstanceOf(Blob);
    expect(result.status).toBe('submitted'); expect(result.message).toContain('DOI hali tasdiqlanmagan');
    expect(JSON.stringify(await getIntegrationJob(result.id))).not.toContain('synthetic-password');
  });
  it('prevents duplicate external submissions under concurrent clicks', async () => {
    const fetcher = vi.fn(async () => new Response('SUCCESS'));
    vi.stubGlobal('fetch', fetcher);
    const [first, second] = await Promise.all([submitCrossref(article, settings), submitCrossref(article, settings)]);
    expect(first.id).toBe(second.id); expect(fetcher).toHaveBeenCalledTimes(1);
    await submitCrossref(article, settings); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('retains uncertainty after a timeout and does not repeat a possibly accepted deposit', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('synthetic-password must not leak'));
    vi.stubGlobal('fetch', fetcher);
    const job = await submitCrossref(article, settings);
    expect(job.status).toBe('unknown'); expect(job.message).not.toContain('synthetic-password');
    await submitCrossref(article, settings); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('does not mistake a successful login/error HTML response for a deposited DOI', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Please login</html>')));
    expect((await submitCrossref(article, settings)).status).toBe('unknown');
  });
  it('creates a Zenodo sandbox draft, uploads PDF and metadata, and never publishes it', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ id: 123, links: { bucket: 'https://sandbox.zenodo.org/api/files/test-bucket' } }, { status: 201 }))
      .mockResolvedValueOnce(Response.json({ key: 'article.pdf' })).mockResolvedValueOnce(Response.json({ id: 123 }));
    vi.stubGlobal('fetch', fetcher);
    const result = await prepareZenodoDraft(article, settings);
    expect(result.status).toBe('ready'); expect(result.remote_id).toBe('123');
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls[1][1].headers['Content-Type']).toBe('application/octet-stream');
    expect(fetcher.mock.calls.map(call => call[0]).join(' ')).not.toContain('/publish');
    const metadata = JSON.parse(fetcher.mock.calls[2][1].body).metadata;
    expect(metadata.license).toBe('cc-by-4.0'); expect(metadata.doi).toBe(article.doi);
    expect(JSON.stringify(metadata)).not.toContain('email');
    await prepareZenodoDraft(article, settings); expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('keeps the created remote ID when file upload fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ id: 456, links: { bucket: 'https://sandbox.zenodo.org/api/files/test-bucket' } })).mockRejectedValueOnce(new Error('timeout')));
    const result = await prepareZenodoDraft(article, settings);
    expect(result.status).toBe('unknown'); expect(result.remote_id).toBe('456');
    expect(result.remote_url).toBe('https://sandbox.zenodo.org/deposit/456');
  });
  it('never forwards repository credentials to a provider-supplied foreign upload host', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ id: 789, links: { bucket: 'https://attacker.example/api/files/bucket' } }));
    vi.stubGlobal('fetch', fetcher);
    const result = await prepareZenodoDraft(article, settings);
    expect(result.status).toBe('unknown'); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('rejects unpublished articles and missing PDFs before making remote calls', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    await expect(prepareZenodoDraft({ ...article, status: 'draft' }, settings)).rejects.toThrow('nashr');
    vi.mocked(readArticlePdf).mockResolvedValueOnce(null);
    await expect(prepareZenodoDraft(article, settings)).rejects.toThrow('topilmadi');
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('ORCID authorization and signed browser proof', () => {
  it('enables production ORCID independently while keeping publishing providers blocked', () => {
    vi.stubEnv('ORCID_MODE', 'production');
    expect(() => orcidConfig()).toThrow('Production');
    vi.stubEnv('ORCID_PRODUCTION_ENABLED', 'true');
    expect(orcidConfig().base).toBe('https://orcid.org');
    vi.stubEnv('CROSSREF_MODE', 'production'); vi.stubEnv('ZENODO_MODE', 'production');
    expect(() => crossrefConfig()).toThrow('Production');
    expect(() => zenodoConfig()).toThrow('Production');
  });
  it('validates ORCID check digits', () => {
    expect(validOrcid('0000-0002-1825-0097')).toBe(true); expect(validOrcid('0000-0002-1825-0098')).toBe(false);
  });
  it('starts on sandbox with signed expiring state and a fixed callback', () => {
    const started = startOrcid('uz'); const url = new URL(started.url);
    expect(url.origin).toBe('https://sandbox.orcid.org'); expect(url.searchParams.get('scope')).toBe('/authenticate');
    expect(readOrcidState(started.state)?.nonce).toBe(url.searchParams.get('state'));
    expect(readOrcidState(started.state + 'tampered')).toBeNull();
    vi.useFakeTimers(); vi.advanceTimersByTime(600001); expect(readOrcidState(started.state)).toBeNull();
  });
  it('exchanges a code without persisting access tokens and detects tampered/expired proof', async () => {
    const fetcher = vi.fn(async () => Response.json({ orcid: '0000-0002-1825-0097', name: 'Test Author', access_token: 'DO-NOT-PERSIST', scope: '/authenticate' }));
    vi.stubGlobal('fetch', fetcher);
    const cookie = await finishOrcid('one-time-code'); const proof = readOrcidProof(cookie);
    expect(proof?.id).toBe('0000-0002-1825-0097'); expect(proof?.environment).toBe('sandbox');
    expect(JSON.stringify(proof)).not.toContain('DO-NOT-PERSIST');
    expect(readOrcidProof(cookie + 'x')).toBeNull();
    vi.useFakeTimers(); vi.advanceTimersByTime(3600001); expect(readOrcidProof(cookie)).toBeNull();
  });
  it('rejects a callback with wrong state before contacting ORCID', async () => {
    const started = startOrcid('en'); const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    const response = await callback(new NextRequest('http://localhost/api/orcid/callback?state=wrong&code=code', { headers: { Cookie: `${orcidStateCookie}=${started.state}` } }));
    expect(fetcher).not.toHaveBeenCalled(); expect(response.headers.get('location')).toContain('orcid=failed');
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  });
});

describe('Email automation and preservation exports', () => {
  it('queues localized status changes only once and only for a corresponding author', async () => {
    const updated = { ...article, original_language: 'uz' as const, status: 'under_review' as const, authors: [{ ...article.authors![0], email: 'author@example.org', is_corresponding: true }] };
    expect(await queueArticleStatusNotification(updated, updated)).toBeNull();
    const previous = { ...updated, status: 'draft' as const };
    const notification = await queueArticleStatusNotification(previous, updated);
    expect(notification?.subject).toContain('Taqrizda');
    expect(await queueArticleStatusNotification(previous, updated)).toBeNull();
    expect(await listNotifications()).toHaveLength(1);
  });
  it('requires the scheduler bearer secret before delivering outbox messages', async () => {
    vi.stubEnv('CRON_SECRET', 'synthetic-cron-secret');
    const fetcher = vi.fn(async () => Response.json({ id: 'mail-test' })); vi.stubGlobal('fetch', fetcher);
    expect((await notificationWorker(new Request('http://localhost'))).status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
    await queueNotificationOnce('cron-test-event', { recipient: 'author@example.org', subject: 'Test', body: 'Synthetic' });
    const result = await notificationWorker(new Request('http://localhost', { headers: { Authorization: 'Bearer synthetic-cron-secret' } }));
    expect(await result.json()).toMatchObject({ attempted: 1, sent: 1 });
    expect(await listNotifications(true)).toHaveLength(0);
    expect(await queueNotificationOnce('cron-test-event', { recipient: 'author@example.org', subject: 'Test', body: 'Synthetic' })).toBeNull();
    expect((await listNotifications())[0].status).toBe('sent');
  });
  it('exports a verifiable archive with no author emails or submission records', async () => {
    const bytes = await archivePackage([article, { ...article, status: 'draft' }], settings);
    const zip = await JSZip.loadAsync(bytes);
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'));
    expect(manifest.entries).toHaveLength(1);
    const pdf = await zip.file(manifest.entries[0].pdf)!.async('uint8array');
    expect(createHash('sha256').update(pdf).digest('hex')).toBe(manifest.entries[0].sha256);
    const metadata = await zip.file(`articles/${article.id}/metadata.json`)!.async('string');
    expect(metadata).not.toContain('email'); expect(metadata).not.toContain('submission_notes');
  });
  it('fails archive export if a stored PDF is missing instead of creating an incomplete archive', async () => {
    vi.mocked(readArticlePdf).mockResolvedValueOnce(null);
    await expect(archivePackage([article], settings)).rejects.toThrow('to‘liq emas');
  });
  it('checks real endpoint contract shapes and reports missing configuration without claiming a connection', async () => {
    vi.stubEnv('ZENODO_ACCESS_TOKEN', ''); vi.stubEnv('CROSSREF_USERNAME', ''); vi.stubEnv('ORCID_CLIENT_ID', '');
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ data: [{ name: 'example.org', status: 'verified' }] })));
    const checks = await checkIntegrations();
    expect(checks.find(check => check.service === 'Resend')?.status).toBe('ok');
    for (const service of ['Crossref', 'ORCID', 'Zenodo']) expect(checks.find(check => check.service === service)?.status).toBe('missing');
    expect(JSON.stringify(checks)).not.toContain('synthetic-resend');
  });
});
