import { mkdir, readFile, readdir, writeFile, rename, link, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { createServerClient } from './supabase/server';

export interface Notification {
  id: string; recipient: string; subject: string; body: string;
  status: 'pending' | 'sent'; attempts: number; last_error: string | null; created_at: string;
}
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
    if (pendingOnly) query = query.eq('status', 'pending');
    const { data, error } = await query.order('created_at', { ascending: pendingOnly }).limit(100);
    if (error) throw new Error('Notification outbox unavailable. Apply migration 008.');
    return data as Notification[];
  }
  try {
    const names = (await readdir(directory())).filter(name => /^[a-z0-9-]+\.json$/.test(name));
    const items = await Promise.all(names.map(async name => JSON.parse(await readFile(path.join(directory(), name), 'utf8')) as Notification));
    return items.filter(item => !pendingOnly || item.status === 'pending').sort((a, b) => pendingOnly ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at)).slice(0, 100);
  } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
}

export async function queueNotification(input: Pick<Notification, 'recipient' | 'subject' | 'body'>) {
  const notification: Notification = { ...input, id: randomUUID(), status: 'pending', attempts: 0, last_error: null, created_at: new Date().toISOString() };
  await save(notification);
  return notification;
}

/** Stable event key prevents retrying an event from resetting an already-sent message. */
export async function queueNotificationOnce(key: string, input: Pick<Notification, 'recipient' | 'subject' | 'body'>) {
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

export function mailConfigured() { return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM); }

export async function deliverNotification(notification: Notification) {
  if (notification.status === 'sent' || !mailConfigured()) return false;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': notification.id },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [notification.recipient], subject: notification.subject, text: notification.body }),
    });
    if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
    await save({ ...notification, status: 'sent', attempts: notification.attempts + 1, last_error: null });
    return true;
  } catch (error) {
    await save({ ...notification, attempts: notification.attempts + 1, last_error: error instanceof Error ? error.message : 'Email delivery failed' });
    return false;
  }
}
