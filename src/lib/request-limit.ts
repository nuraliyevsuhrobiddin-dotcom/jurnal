import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from './supabase/server';

const windows = new Map<string, { count: number; expires: number }>();

// Only trust the hosting provider's IP header. Other deployments share a bucket
// unless their reverse proxy is explicitly configured to replace X-Real-IP.
export function requestIdentity(request: NextRequest) {
  return (process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0] :
    process.env.TRUST_PROXY_IP === 'true' ? request.headers.get('x-real-ip') : null)?.trim() || 'shared';
}

export async function consumeLimit(scope: string, identity: string, limit: number, seconds: number) {
  const key = createHash('sha256').update(`${scope}:${identity}`).digest('hex');
  const client = createServerClient();
  if (client) {
    const { data, error } = await client.rpc('consume_request_limit', { bucket_key: key, max_requests: limit, window_seconds: seconds });
    if (error) throw new Error('Request protection unavailable. Apply migration 008.');
    return Number(data);
  }
  const now = Date.now();
  for (const [key, value] of windows) if (value.expires <= now) windows.delete(key);
  const value = windows.get(key) || { count: 0, expires: now + seconds * 1000 };
  // Bound memory on standalone servers too.
  if (!windows.has(key) && windows.size >= 10000) return seconds;
  if (value.count >= limit) return Math.max(1, Math.ceil((value.expires - now) / 1000));
  value.count++;
  windows.set(key, value);
  return 0;
}

export async function protectRequest(request: NextRequest, scope: string, limit: number, seconds = 900, identity = requestIdentity(request)) {
  try {
    const retry = await consumeLimit(scope, identity, limit, seconds);
    if (retry > 0) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(retry), 'Cache-Control': 'no-store' } });
    return null;
  } catch (error) {
    console.error('Request protection:', error);
    return NextResponse.json({ error: 'Service temporarily unavailable. Please try later.' }, { status: 503, headers: { 'Retry-After': '60' } });
  }
}
