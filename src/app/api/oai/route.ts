import { NextRequest } from 'next/server';
import { getJournalSettings, getPublishedArticles } from '@/lib/db';
import { oaiResponse } from '@/lib/oai-pmh';
import { boundedBody, BodyLimitError } from '@/lib/bounded-body';

async function respond(parameters: URLSearchParams) {
  try {
    const [articles, settings] = await Promise.all([getPublishedArticles(), getJournalSettings()]);
    return new Response(oaiResponse(parameters, articles, settings), { headers: { 'Content-Type': 'text/xml; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  } catch {
    return new Response('Repository temporarily unavailable', { status: 503, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } });
  }
}

export async function GET(request: NextRequest) {
  if (request.nextUrl.search.length > 16384) return new Response(null, { status: 413 });
  return respond(request.nextUrl.searchParams);
}

export async function POST(request: NextRequest) {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/x-www-form-urlencoded') return new Response(null, { status: 415 });
  try {
    const body = await boundedBody(request, 16384);
    const parameters = new URLSearchParams(request.nextUrl.searchParams);
    for (const [key, value] of new URLSearchParams(new TextDecoder().decode(body))) parameters.append(key, value);
    return respond(parameters);
  } catch (error) {
    return new Response(null, { status: error instanceof BodyLimitError ? 413 : 400 });
  }
}
