import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Article } from '@/types/journal';

function secret() {
  const value = process.env.TRACKING_SECRET || process.env.ADMIN_PASSWORD;
  if (!value) throw new Error('Tracking signing secret is not configured');
  return value;
}
export function trackingUrl(articleId: string, now = Date.now()) {
  const expires = Math.floor(now / 86400000) * 86400 + 180 * 86400;
  const payload = `${articleId}.${expires}`;
  const signature = createHmac('sha256', secret()).update(`tracking:${payload}`).digest('base64url');
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://agmjoural.uz').replace(/\/$/, '');
  return `${base}/track/${payload}.${signature}`;
}
export function readTrackingToken(token: string, now = Date.now()): string | null {
  if (token.length > 200) return null;
  const [id, expires, signature, extra] = token.split('.');
  if (extra || !/^[a-f0-9-]{36}$/i.test(id || '') || !/^\d{10}$/.test(expires || '') || Number(expires) * 1000 < now) return null;
  if (!signature || !/^[A-Za-z0-9_-]{43}$/.test(signature)) return null;
  const expected = createHmac('sha256', secret()).update(`tracking:${id}.${expires}`).digest('base64url');
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature)) ? id : null;
}
export function submissionReference(article: Pick<Article, 'id' | 'manuscript_file_url'>) {
  const manuscriptId = article.manuscript_file_url?.split('/').pop() || article.id;
  return `AGM-SUB-${manuscriptId.slice(0, 8).toUpperCase()}`;
}
