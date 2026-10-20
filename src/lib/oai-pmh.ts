import type { Article, JournalSettings } from '@/types/journal';
import { dublinCore, xml } from './scholarly-feeds';
import { siteUrl } from './site-url';

const pageSize = 100;
const verbs: Record<string, { required: string[]; optional: string[] }> = {
  Identify: { required: [], optional: [] },
  ListMetadataFormats: { required: [], optional: ['identifier'] },
  ListSets: { required: [], optional: ['resumptionToken'] },
  GetRecord: { required: ['identifier', 'metadataPrefix'], optional: [] },
  ListRecords: { required: ['metadataPrefix'], optional: ['from', 'until', 'set', 'resumptionToken'] },
  ListIdentifiers: { required: ['metadataPrefix'], optional: ['from', 'until', 'set', 'resumptionToken'] },
};

export const oaiIdentifier = (article: Article) => siteUrl(`/api/articles/${encodeURIComponent(article.id)}/metadata`);
const stamp = (article: Article) => new Date(article.updated_at).toISOString().replace(/\.\d{3}Z$/, 'Z');
const header = (article: Article) => `<header><identifier>${xml(oaiIdentifier(article))}</identifier><datestamp>${stamp(article)}</datestamp></header>`;
const error = (code: string, message: string) => `<error code="${code}">${xml(message)}</error>`;

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().replace(/\.\d{3}Z$/, 'Z').startsWith(value);
}

interface Cursor { version: 1; verb: string; from: string; until: string; afterStamp: string; afterId: string; count: number }

function decodeCursor(value: string, verb: string): Cursor | null {
  try {
    if (!/^[A-Za-z0-9_-]{1,2048}$/.test(value)) return null;
    const cursor = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Cursor;
    if (cursor.version !== 1 || cursor.verb !== verb || typeof cursor.from !== 'string' || typeof cursor.until !== 'string' ||
      (cursor.from && !validDate(cursor.from)) || (cursor.until && !validDate(cursor.until)) ||
      !validDate(cursor.afterStamp) || typeof cursor.afterId !== 'string' || cursor.afterId.length > 200 ||
      !Number.isSafeInteger(cursor.count) || cursor.count < 1) return null;
    return cursor;
  } catch { return null; }
}

/** No sets or deletion history are advertised; unpublished records never leave this module. */
export function oaiResponse(parameters: URLSearchParams, input: Article[], settings: JournalSettings, now = new Date()) {
  const articles = input.filter(article => article.status === 'published' && Number.isFinite(Date.parse(article.updated_at)))
    .sort((a, b) => stamp(a).localeCompare(stamp(b)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const verb = parameters.get('verb') || '';
  const specification = Object.hasOwn(verbs, verb) ? verbs[verb] : undefined;
  const pairs = [...parameters.entries()];
  const duplicate = new Set(pairs.map(([key]) => key)).size !== pairs.length;
  let invalidArguments = duplicate;
  let content: string;
  if (!specification) {
    content = error('badVerb', 'Supply a supported OAI-PMH verb.');
  } else {
    const token = parameters.get('resumptionToken');
    const resumed = parameters.has('resumptionToken') && (verb === 'ListRecords' || verb === 'ListIdentifiers');
    const allowed = resumed ? ['verb', 'resumptionToken'] : ['verb', ...specification.required, ...specification.optional];
    invalidArguments ||= pairs.some(([key, value]) => !allowed.includes(key) || !value) ||
      (!resumed && specification.required.some(key => !parameters.get(key)));
    if (invalidArguments) content = error('badArgument', 'Missing, repeated, empty or unsupported arguments.');
    else if (parameters.has('metadataPrefix') && parameters.get('metadataPrefix') !== 'oai_dc') content = error('cannotDisseminateFormat', 'Only oai_dc is supported.');
    else if (verb === 'Identify') {
      content = `<Identify><repositoryName>${xml(settings.journal_name)}</repositoryName><baseURL>${xml(siteUrl('/api/oai'))}</baseURL>` +
        `<protocolVersion>2.0</protocolVersion><adminEmail>${xml(settings.contact_email)}</adminEmail>` +
        `<earliestDatestamp>${articles.length ? stamp(articles[0]) : '1970-01-01T00:00:00Z'}</earliestDatestamp>` +
        `<deletedRecord>no</deletedRecord><granularity>YYYY-MM-DDThh:mm:ssZ</granularity></Identify>`;
    } else if (verb === 'ListSets') content = error('noSetHierarchy', 'This repository does not support sets.');
    else if (verb === 'ListMetadataFormats' || verb === 'GetRecord') {
      const identifier = parameters.get('identifier');
      const article = articles.find(item => oaiIdentifier(item) === identifier);
      if (identifier && !article) content = error('idDoesNotExist', 'No published record with this identifier.');
      else if (verb === 'ListMetadataFormats') content = '<ListMetadataFormats><metadataFormat><metadataPrefix>oai_dc</metadataPrefix><schema>http://www.openarchives.org/OAI/2.0/oai_dc.xsd</schema><metadataNamespace>http://www.openarchives.org/OAI/2.0/oai_dc/</metadataNamespace></metadataFormat></ListMetadataFormats>';
      else content = `<GetRecord><record>${header(article!)}<metadata>${dublinCore(article!, settings)}</metadata></record></GetRecord>`;
    } else {
      const cursor = resumed ? decodeCursor(token || '', verb) : null;
      const from = cursor?.from || parameters.get('from') || '';
      const until = cursor?.until || parameters.get('until') || '';
      const badDates = (from && !validDate(from)) || (until && !validDate(until)) ||
        (from && until && (from.length !== until.length || from > until));
      if (resumed && !cursor) content = error('badResumptionToken', 'The resumption token is invalid.');
      else if (badDates) { invalidArguments = true; content = error('badArgument', 'Use matching UTC date granularity and a valid date range.'); }
      else if (parameters.has('set')) content = error('noSetHierarchy', 'This repository does not support sets.');
      else {
        const matches = articles.filter(article => {
          const date = stamp(article);
          return (!from || date.slice(0, from.length) >= from) && (!until || date.slice(0, until.length) <= until) &&
            (!cursor || date > cursor.afterStamp || (date === cursor.afterStamp && article.id > cursor.afterId));
        });
        if (!matches.length) content = error(resumed ? 'badResumptionToken' : 'noRecordsMatch', 'No published records match this request.');
        else {
          const batch = matches.slice(0, pageSize);
          let next = '';
          if (matches.length > pageSize) {
            const last = batch[batch.length - 1];
            next = Buffer.from(JSON.stringify({ version: 1, verb, from, until, afterStamp: stamp(last), afterId: last.id, count: (cursor?.count || 0) + batch.length } satisfies Cursor)).toString('base64url');
          }
          content = `<${verb}>` + batch.map(article => verb === 'ListIdentifiers' ? header(article) : `<record>${header(article)}<metadata>${dublinCore(article, settings)}</metadata></record>`).join('') +
            (next || resumed ? `<resumptionToken cursor="${cursor?.count || 0}">${next}</resumptionToken>` : '') + `</${verb}>`;
        }
      }
    }
  }
  const attributes = specification && !invalidArguments ? pairs.map(([key, value]) => ` ${key}="${xml(value)}"`).join('') : '';
  return `<?xml version="1.0" encoding="UTF-8"?><OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">` +
    `<responseDate>${now.toISOString().replace(/\.\d{3}Z$/, 'Z')}</responseDate><request${attributes}>${xml(siteUrl('/api/oai'))}</request>${content}</OAI-PMH>`;
}
