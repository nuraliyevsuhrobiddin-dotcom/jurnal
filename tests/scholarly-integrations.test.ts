import { describe, expect, it, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { journalStore } from '@/lib/data-store';
import { oaiIdentifier, oaiResponse } from '@/lib/oai-pmh';
import { rssFeed, publicArticleMetadata, xml } from '@/lib/scholarly-feeds';
import { crossrefXml, crossrefGaps } from '@/lib/crossref-export';
import { GET as metadataGet } from '@/app/api/articles/[id]/metadata/route';
import { GET as crossrefGet } from '@/app/api/admin/articles/[id]/crossref/route';
import { GET as oaiGet, POST as oaiPost } from '@/app/api/oai/route';
import { adminAccess } from '@/lib/admin-access';
import { getArticleById, getPublishedArticles } from '@/lib/db';
import type { Article } from '@/types/journal';

vi.mock('@/lib/admin-access', () => ({ adminAccess: vi.fn(async () => null) }));
vi.mock('@/lib/db', () => ({
  getArticleById: vi.fn(async () => journalStore.articles[0]),
  getPublishedArticles: vi.fn(async () => [journalStore.articles[0]]),
  getJournalSettings: vi.fn(async () => journalStore.settings),
}));
afterEach(() => vi.clearAllMocks());

const article = { ...journalStore.articles[0], status: 'published' as const, updated_at: '2026-10-20T10:30:05.123Z' };
const settings = journalStore.settings;
const oai = (query: string, records: Article[] = [article]) => oaiResponse(new URLSearchParams(query), records, settings);

describe('Open scholarly feeds', () => {
  it('escapes hostile XML and removes invalid XML control characters', () => {
    expect(xml('<research & "science">\u0000😀')).toBe('&lt;research &amp; &quot;science&quot;&gt;😀');
    const feed = rssFeed([{ ...article, title_en: '<script>bad & title</script>' }, { ...article, status: 'draft', title_en: 'PRIVATE DRAFT' }], settings, 'en');
    expect(feed).toContain('&lt;script&gt;bad &amp; title&lt;/script&gt;');
    expect(feed).not.toContain('PRIVATE DRAFT');
    expect(feed).not.toContain('<script>');
    expect(feed).toContain('<guid isPermaLink="false">');
    expect(feed).not.toContain('Invalid Date');
  });
  it('whitelists public metadata without leaking email, notes or manuscript access paths', () => {
    const result = JSON.stringify(publicArticleMetadata({ ...article, submission_notes: 'PRIVATE NOTES', retraction_reason: 'INTERNAL', manuscript_file_url: '/private/manuscript', authors: [{ ...article.authors![0], email: 'private-email@example.org' }] }, settings, 'en'));
    for (const privateValue of ['PRIVATE NOTES', 'INTERNAL', '/private/manuscript', 'private-email@example.org']) expect(result).not.toContain(privateValue);
    expect(result).toContain(article.id);
  });
  it('identifies the repository and excludes unpublished OAI records', () => {
    expect(oai('verb=Identify')).toContain('<deletedRecord>no</deletedRecord>');
    expect(oai('verb=Identify')).toContain('<earliestDatestamp>2026-10-20T10:30:05Z</earliestDatestamp>');
    const response = oai('verb=ListRecords&metadataPrefix=oai_dc', [article, { ...article, id: 'PRIVATE-ID', status: 'draft' }]);
    expect(response).toContain('<oai_dc:dc');
    expect(response).not.toContain('PRIVATE-ID');
    expect(oai('verb=ListMetadataFormats')).toContain('<metadataPrefix>oai_dc</metadataPrefix>');
    expect(oai('verb=ListSets')).toContain('code="noSetHierarchy"');
  });
  it('implements protocol errors without reflecting invalid argument attributes', () => {
    for (const verb of ['Unknown', 'toString', '__proto__', '']) expect(oai(`verb=${verb}`)).toContain('code="badVerb"');
    for (const query of ['verb=Identify&extra=x', 'verb=Identify&verb=Identify', 'verb=ListRecords', 'verb=GetRecord&metadataPrefix=oai_dc', 'verb=ListRecords&metadataPrefix=oai_dc&from=2026-02-30', 'verb=ListRecords&metadataPrefix=oai_dc&from=2026-10-01&until=2026-10-20T00:00:00Z']) {
      const response = oai(query);
      expect(response).toContain('code="badArgument"');
      expect(response).toContain('<request>');
    }
    expect(oai('verb=ListRecords&metadataPrefix=unsupported')).toContain('code="cannotDisseminateFormat"');
    expect(oai('verb=ListRecords&metadataPrefix=oai_dc&set=any')).toContain('code="noSetHierarchy"');
    expect(oai('verb=ListRecords&metadataPrefix=oai_dc&from=2026-10-21')).toContain('code="noRecordsMatch"');
  });
  it('honors inclusive UTC dates and published-only GetRecord identifiers', () => {
    expect(oai('verb=ListIdentifiers&metadataPrefix=oai_dc&from=2026-10-20&until=2026-10-20')).toContain(oaiIdentifier(article));
    const query = new URLSearchParams({ verb: 'GetRecord', metadataPrefix: 'oai_dc', identifier: oaiIdentifier(article) });
    expect(oai(query.toString())).toContain('<GetRecord><record>');
    query.set('identifier', 'missing');
    expect(oai(query.toString())).toContain('code="idDoesNotExist"');
    expect(oai('verb=ListMetadataFormats&identifier=missing')).toContain('code="idDoesNotExist"');
  });
  it('paginates tied timestamps deterministically, tolerates inserts before the cursor, and closes the list', () => {
    const records = Array.from({ length: 105 }, (_, index) => ({ ...article, id: `item-${String(index).padStart(3, '0')}` }));
    const first = oai('verb=ListIdentifiers&metadataPrefix=oai_dc', records);
    expect(first.match(/<header>/g)).toHaveLength(100);
    const token = first.match(/<resumptionToken[^>]*>([^<]+)<\/resumptionToken>/)![1];
    const next = oai(`verb=ListIdentifiers&resumptionToken=${token}`, [{ ...article, id: 'item-000-before' }, ...records]);
    expect(next.match(/<header>/g)).toHaveLength(5);
    expect(next).toContain('<resumptionToken cursor="100"></resumptionToken>');
    expect(next).not.toContain('item-099/metadata');
    expect(oai(`verb=ListRecords&resumptionToken=${token}`, records)).toContain('code="badResumptionToken"');
    expect(oai('verb=ListRecords&resumptionToken=bad')).toContain('code="badResumptionToken"');
    expect(oai(`verb=ListIdentifiers&metadataPrefix=oai_dc&resumptionToken=${token}`, records)).toContain('code="badArgument"');
  });
});

describe('Crossref preparation', () => {
  const configured = { ...settings, doi_prefix: '10.5555', issn_online: '2049-3630', publisher: 'Research & Science', contact_email: 'editor@example.org' };
  const publication = { ...article, doi: '10.5555/research', title_en: 'Research & evidence', abstract_en: 'A scientific abstract.', keywords_en: ['research'], publication_date: '2026-10-20' };
  it('requires a real configured prefix and metadata instead of inventing a DOI', () => {
    expect(crossrefGaps({ ...publication, doi: undefined }, configured)).toContain('Nashriyot prefiksiga mos DOI');
    expect(() => crossrefXml({ ...publication, doi: '10.9999/other' }, configured)).toThrow('prefiksiga mos');
    expect(() => crossrefXml({ ...publication, status: 'draft' }, configured)).toThrow('Nashr qilingan');
    expect(() => crossrefXml(publication, { ...configured, issn_online: '0000-0001', issn_print: undefined })).toThrow('ISSN');
    expect(() => crossrefXml({ ...publication, publication_date: '2026-02-30' }, configured)).toThrow('Nashr sanasi');
  });
  it('builds a download with escaped text, authors and references without contacting Crossref', () => {
    const result = crossrefXml({ ...publication, references_list: ['Source <1> & evidence'] }, configured);
    expect(result).toContain('version="5.3.1"');
    expect(result).toContain('Research &amp; evidence');
    expect(result).toContain('Source &lt;1&gt; &amp; evidence');
    expect(result).toContain('<doi>10.5555/research</doi>');
    expect(result).toContain('<surname>');
    expect(result).not.toContain(article.authors![0].email || 'THIS-EMAIL-IS-NOT-SET');
  });
});

describe('Integration access boundaries', () => {
  it('does not expose draft metadata', async () => {
    vi.mocked(getArticleById).mockResolvedValueOnce({ ...article, status: 'draft' });
    const response = await metadataGet(new NextRequest('http://localhost/api/metadata'), { params: Promise.resolve({ id: article.id }) });
    expect(response.status).toBe(404);
  });
  it('protects Crossref exports before reading article data', async () => {
    vi.mocked(adminAccess).mockResolvedValueOnce(new Response(null, { status: 401 }) as Awaited<ReturnType<typeof adminAccess>>);
    const response = await crossrefGet(new Request('http://localhost'), { params: Promise.resolve({ id: article.id }) });
    expect(response.status).toBe(401);
    expect(getArticleById).not.toHaveBeenCalled();
  });
  it('serves OAI over GET and form POST and rejects unsupported media', async () => {
    const get = await oaiGet(new NextRequest('http://localhost/api/oai?verb=Identify'));
    expect(get.status).toBe(200); expect(get.headers.get('content-type')).toContain('xml');
    const post = await oaiPost(new NextRequest('http://localhost/api/oai', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'verb=ListMetadataFormats' }));
    expect(await post.text()).toContain('<ListMetadataFormats>');
    expect((await oaiPost(new NextRequest('http://localhost/api/oai', { method: 'POST', body: '{}' }))).status).toBe(415);
  });
  it('returns a retryable HTTP error on storage failures rather than an empty repository', async () => {
    vi.mocked(getPublishedArticles).mockRejectedValueOnce(new Error('DB unavailable'));
    const response = await oaiGet(new NextRequest('http://localhost/api/oai?verb=ListRecords&metadataPrefix=oai_dc'));
    expect(response.status).toBe(503); expect(response.headers.get('retry-after')).toBe('60');
  });
});
