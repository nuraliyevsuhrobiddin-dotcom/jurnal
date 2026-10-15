import { createHmac, timingSafeEqual } from 'node:crypto';

export const adminCookie = 'agm-admin';

export function createAdminSession() {
  const expires = String(Date.now() + 8 * 60 * 60 * 1000);
  const signature = createHmac('sha256', process.env.ADMIN_PASSWORD!).update(`agm:${expires}`).digest('hex');
  return `${expires}.${signature}`;
}

export function validAdminSession(session?: string) {
  if (!process.env.ADMIN_PASSWORD) return process.env.NODE_ENV !== 'production';
  if (!session) return false;
  const [expires, signature] = session.split('.');
  if (!expires || !signature || !/^\d+$/.test(expires) || !Number.isSafeInteger(Number(expires)) || Number(expires) < Date.now()) return false;
  const expected = createHmac('sha256', process.env.ADMIN_PASSWORD).update(`agm:${expires}`).digest('hex');
  const actual = Buffer.from(signature);
  const required = Buffer.from(expected);
  return actual.length === required.length && timingSafeEqual(actual, required);
}

export function validAdminPassword(password: unknown) {
  if (typeof password !== 'string' || !process.env.ADMIN_PASSWORD) return false;
  const actual = Buffer.from(password);
  const required = Buffer.from(process.env.ADMIN_PASSWORD);
  return actual.length === required.length && timingSafeEqual(actual, required);
}
