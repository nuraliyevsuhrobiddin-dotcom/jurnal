import { mkdir, readFile, readdir, writeFile, rename, link, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { createServerClient } from './supabase/server';
import type { PublicationAttachment } from './publication-notifications';
import { gmailAccessToken, gmailMessage } from './gmail';
import { z } from 'zod';

export interface Notification {
  id: string; recipient: string; subject: string; body: string;
  status: 'pending' | 'sent' | 'unknown'; attempts: number; last_error: string | null; created_at: string;
  publication?: PublicationAttachment | null;
  kind?: 'message' | 'admin_alert';
  next_attempt_at?: string | null;
}
type NotificationInput = Pick<Notification, 'recipient' | 'subject' | 'body' | 'publication' | 'kind'>;
const directory = () => path.join(process.env.JOURNAL_DATA_DIR || path.join(process.cwd(), '.data'), 'notifications');

async function save(notification: Notification) {
  const client = createServerClient();
  if (client) {
    const { error } = await client.from('notification_outbox').upsert(notification);
    if (error) throw new Error('Notification could not be queued. Apply migration 008.');
  } else {
    await mkdir(directory(), { recursive: true });
    const filename = path.join(directory(), `${notification.id}.json`);
    const temporary = `${filename}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(notification), { mode: 0o600 });
    await rename(temporary, filename);
  }
}

export async function listNotifications(pendingOnly = false): Promise<Notification[]> {
  const client = createServerClient();
  if (client) {
    let query = client.from('notification_outbox').select('*');
    if (pendingOnly) query = query.eq('status', 'pending').or(`next_attempt_at.is.null,next_attempt_at.lte.${new Date().toISOString()}`);
    const { data, error } = await query.order('created_at', { ascending: pendingOnly }).limit(100);
    if (error) throw new Error('Notification outbox unavailable. Apply migration 008.');
    return data as Notification[];
  }
  try {
    const names = (await readdir(directory())).filter(name => /^[a-z0-9-]+\.json$/.test(name));
    const items = await Promise.all(names.map(async name => JSON.parse(await readFile(path.join(directory(), name), 'utf8')) as Notification));
    return items.filter(item => !pendingOnly || (item.status === 'pending' && (!item.next_attempt_at || Date.parse(item.next_attempt_at) <= Date.now()))).sort((a, b) => pendingOnly ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at)).slice(0, 100);
  } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
}

export async function queueNotification(input: NotificationInput) {
  const notification: Notification = { ...input, id: randomUUID(), status: 'pending', attempts: 0, last_error: null, created_at: new Date().toISOString() };
  await save(notification);
  return notification;
}

/** Stable event key prevents retrying an event from resetting an already-sent message. */
export async function queueNotificationOnce(key: string, input: NotificationInput) {
  const bytes = createHash('sha256').update(key).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  const notification: Notification = { ...input, id, status: 'pending', attempts: 0, last_error: null, created_at: new Date().toISOString() };
  const client = createServerClient();
  if (client) {
    const { error, data } = await client.from('notification_outbox').upsert(notification, { onConflict: 'id', ignoreDuplicates: true }).select('id');
    if (error) throw new Error('Notification could not be queued. Apply migration 008.');
    return data?.length ? notification : null;
  }
  await mkdir(directory(), { recursive: true });
  const filename = path.join(directory(), `${id}.json`);
  const temporary = `${filename}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(notification), { mode: 0o600 });
  try { await link(temporary, filename); return notification; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'EEXIST') return null; throw error; }
  finally { await unlink(temporary); }
}

export function mailProvider() { return process.env.MAIL_PROVIDER || 'resend'; }
export function mailConfigured() {
  if (mailProvider() === 'gmail') return Boolean(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN && process.env.GMAIL_SENDER);
  return mailProvider() === 'resend' && Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

// Gmail has no idempotency key: reserve before sending and stop automatic retries
// when a timeout or process interruption leaves delivery uncertain.
async function claimGmail(notification: Notification) {
  const claimed = { ...notification, status: 'unknown' as const, last_error: 'Gmail yuborish natijasi kutilmoqda. Qayta yuborishdan oldin Sent papkasini tekshiring.' };
  const client = createServerClient();
  if (client) {
    const { data, error } = await client.from('notification_outbox').update({ status: claimed.status, last_error: claimed.last_error }).eq('id', notification.id).eq('status', 'pending').select('id');
    if (error) throw new Error('Gmail navbatini band qilib bo‘lmadi. Migration 010 ni qo‘llang.');
    return Boolean(data?.length);
  }
  const filename = path.join(directory(), `${notification.id}.json`);
  const lock = `${filename}.lock`;
  try { await writeFile(lock, '', { flag: 'wx', mode: 0o600 }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false; throw error; }
  try {
    const current = JSON.parse(await readFile(filename, 'utf8')) as Notification;
    if (current.status !== 'pending') return false;
    await save(claimed);
    return true;
  } finally { await unlink(lock); }
}

export async function deliverNotification(notification: Notification) {
  if (notification.status !== 'pending' || !mailConfigured()) return false;
  let gmailClaimed = false;
  let accepted = false;
  let rejected = false;
  try {
    const attachments = notification.publication
      ? await (await import('./publication-notifications')).publicationAttachments(notification.publication) : [];
    let response: Response;
    if (mailProvider() === 'gmail') {
      const token = await gmailAccessToken();
      const raw = gmailMessage(notification, attachments);
      gmailClaimed = await claimGmail(notification);
      if (!gmailClaimed) return false;
      response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST', signal: AbortSignal.timeout(10000), redirect: 'error',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw }),
      });
    } else response = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': notification.id },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [notification.recipient], subject: notification.subject, text: notification.body, ...(attachments.length ? { attachments } : {}) }),
    });
    rejected = !response.ok && response.status < 500;
    if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
    accepted = true;
    await save({ ...notification, status: 'sent', attempts: notification.attempts + 1, last_error: null, next_attempt_at: null });
    return true;
  } catch (error) {
    const status = gmailClaimed && (!rejected || accepted) ? 'unknown' : 'pending';
    await save({ ...notification, status, attempts: notification.attempts + 1, next_attempt_at: new Date(Date.now() + Math.min(3600, 60 * 2 ** Math.min(notification.attempts, 6)) * 1000).toISOString(), last_error: status === 'unknown' ? 'Gmail natijasi noaniq. Sent papkasini tekshiring; avtomatik qayta yuborish to‘xtatildi.' : error instanceof Error ? error.message : 'Email delivery failed' });
    await alertEmailFailure(notification, status);
    return false;
  }
}

async function alertEmailFailure(notification: Notification, status: string) {
  if (notification.kind === 'admin_alert') return;
  try {
    const { getJournalSettings } = await import('./db');
    const recipient = (await getJournalSettings()).contact_email;
    if (!z.email().safeParse(recipient).success) return;
    const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://agmjoural.uz').replace(/\/$/, '');
    await queueNotificationOnce(`mail-failure:${notification.id}`, {
      recipient, kind: 'admin_alert', subject: 'AGM Journal — Email yuborishda xato',
      body: `Email yuborish yakunlanmadi.\nXabar ID: ${notification.id}\nHolat: ${status}\n\n${base}/admin/notifications\n\nNoaniq natijali xatni qayta yuborishdan oldin Gmail Sent papkasini tekshiring.`,
    });
    // The next worker pass sends this alert. Alert failures never recurse.
  } catch { console.error('Email failure alert unavailable. Inspect the admin outbox.'); }
}

export async function drainNotificationQueue(limit = 30, budgetMs = 30000) {
  const pending = (await listNotifications(true)).slice(0, limit);
  const deadline = Date.now() + budgetMs;
  let attempted = 0, sent = 0;
  // Two concurrent sends keep provider request rate and memory bounded.
  for (let offset = 0; offset < pending.length && Date.now() < deadline; offset += 2) {
    const batch = pending.slice(offset, offset + 2);
    const results = await Promise.allSettled(batch.map(item => deliverNotification(item)));
    attempted += batch.length;
    sent += results.filter(result => result.status === 'fulfilled' && result.value).length;
  }
  return { attempted, sent, pending: pending.length - sent };
}
