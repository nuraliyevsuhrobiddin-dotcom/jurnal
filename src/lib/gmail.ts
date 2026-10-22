import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { EmailAttachment } from './publication-notifications';

export async function gmailAccessToken() {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', signal: AbortSignal.timeout(10000), redirect: 'error',
    body: new URLSearchParams({ client_id: process.env.GMAIL_CLIENT_ID || '', client_secret: process.env.GMAIL_CLIENT_SECRET || '', refresh_token: process.env.GMAIL_REFRESH_TOKEN || '', grant_type: 'refresh_token' }),
  });
  if (!response.ok) throw new Error(`Gmail OAuth xatosi (${response.status}). Google ulanishini tekshiring.`);
  const payload = await response.json();
  if (typeof payload.access_token !== 'string' || !payload.access_token) throw new Error('Gmail access token olinmadi.');
  return payload.access_token as string;
}

const lines = (base64: string) => base64.match(/.{1,76}/g)?.join('\r\n') || '';
export function gmailMessage(message: { id: string; recipient: string; subject: string; body: string }, attachments: EmailAttachment[]) {
  const sender = process.env.GMAIL_SENDER || '';
  if (!z.email().safeParse(sender).success || !z.email().safeParse(message.recipient).success) throw new Error('Gmail email manzili noto‘g‘ri.');
  const boundary = `agm-${randomUUID()}`;
  const encodedSubject = Array.from(message.subject.replace(/[\r\n]/g, ' ')).reduce<string[]>((parts, char) => {
    if (!parts.length || Buffer.byteLength(parts[parts.length - 1] + char) > 42) parts.push(char);
    else parts[parts.length - 1] += char;
    return parts;
  }, []).map(part => `=?UTF-8?B?${Buffer.from(part).toString('base64')}?=`).join('\r\n ');
  const parts = [
    `From: ${sender}`, `To: ${message.recipient}`, `Subject: ${encodedSubject}`,
    `Message-ID: <${message.id}@${sender.split('@')[1]}>`, `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0', `Content-Type: multipart/mixed; boundary="${boundary}"`, '',
    `--${boundary}`, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', lines(Buffer.from(message.body).toString('base64')),
  ];
  for (const file of attachments) {
    if (!/^[a-zA-Z0-9_.-]+$/.test(file.filename)) throw new Error('Invalid attachment filename');
    parts.push(`--${boundary}`, `Content-Type: application/pdf; name="${file.filename}"`, `Content-Disposition: attachment; filename="${file.filename}"`, 'Content-Transfer-Encoding: base64', '', lines(file.content));
  }
  parts.push(`--${boundary}--`, '');
  return Buffer.from(parts.join('\r\n')).toString('base64url');
}
