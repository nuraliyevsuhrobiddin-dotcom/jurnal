import { createHash } from 'node:crypto';
import type { Article, JournalSettings } from '@/types/journal';
import { crossrefXml } from './crossref-export';
import { configured, crossrefConfig, zenodoConfig, IntegrationError, providerJson } from './integration-config';
import { claimIntegrationJob, getIntegrationJob, saveIntegrationJob, type IntegrationJob } from './integration-jobs';
import { publicArticleMetadata, articleUrl, xml } from './scholarly-feeds';
import { readArticlePdf } from './pdf/storage';

const hash = (text: string) => createHash('sha256').update(text).digest('hex');

async function runJob(provider: IntegrationJob['provider'], environment: string, article: Article, fingerprint: string, operation: (job: IntegrationJob) => Promise<IntegrationJob>) {
  const id = hash(`${provider}:${environment}:${article.id}:${fingerprint}`);
  const now = new Date().toISOString();
  const job: IntegrationJob = { id, article_id: article.id, provider, environment, status: 'pending', message: 'Tashqi so‘rov boshlandi; natija kutilmoqda.', created_at: now, updated_at: now };
  if (!(await claimIntegrationJob(job))) {
    const existing = await getIntegrationJob(id);
    if (!existing) throw new IntegrationError('Integratsiya natijasini o‘qib bo‘lmadi.');
    return existing;
  }
  let result: IntegrationJob;
  try { result = await operation(job); }
  catch (error) {
    // Timeouts and provider errors can occur after a remote resource was created.
    const saved = await getIntegrationJob(id);
    result = { ...(saved || job), status: 'unknown', message: error instanceof IntegrationError ? error.message : 'Tashqi so‘rov natijasi noma’lum. Provayderni tekshirmasdan qayta yubormang.' };
  }
  return saveIntegrationJob({ ...result, updated_at: new Date().toISOString() });
}

export function depositConfigured(provider: 'crossref' | 'zenodo') {
  return configured(provider === 'crossref' ? crossrefConfig : zenodoConfig);
}

export async function submitCrossref(article: Article, settings: JournalSettings) {
  const config = crossrefConfig();
  const content = crossrefXml(article, settings);
  const fingerprint = hash(JSON.stringify({ metadata: publicArticleMetadata(article, settings, 'en'), settings }));
  return runJob('crossref', config.environment, article, fingerprint, async job => {
    const tracked = { ...job, remote_id: content.match(/<doi_batch_id>([^<]+)<\/doi_batch_id>/)?.[1] || null };
    await saveIntegrationJob(tracked);
    const form = new FormData();
    form.set('operation', 'doMDUpload'); form.set('login_id', config.username); form.set('login_passwd', config.password);
    form.set('fname', new Blob([content], { type: 'application/xml' }), `agm-${job.id}.xml`);
    const response = await fetch(config.url, { method: 'POST', body: form, redirect: 'error', signal: AbortSignal.timeout(20000) });
    if (!response.ok) return { ...tracked, status: 'failed', message: `Crossref HTTP ${response.status}. Hisob va depozit jurnalini tekshiring.` };
    const text = await response.text();
    const accepted = /\bSUCCESS\b|successfully\s+(?:received|submitted)/i.test(text) && !/\b(?:FAILURE|FAILED)\b/i.test(text);
    return { ...tracked, status: accepted ? 'submitted' : 'unknown', message: accepted ? 'Crossref navbatiga topshirildi. Yakuniy qayta ishlash hisobotini tekshiring; DOI hali tasdiqlanmagan.' : 'Crossref javobidan qabul holatini aniqlab bo‘lmadi. Hisobdagi topshirish jurnalini tekshiring.' };
  });
}

export async function prepareZenodoDraft(article: Article, settings: JournalSettings) {
  const config = zenodoConfig();
  if (article.status !== 'published') throw new IntegrationError('Faqat nashr qilingan maqola arxivlanadi.', 422);
  if (!article.title_en?.trim() || !article.abstract_en?.trim() || !article.authors?.length || !article.publication_date) throw new IntegrationError('Inglizcha metama’lumotlar, mualliflar va nashr sanasini to‘ldiring.', 422);
  if (article.license !== 'CC BY 4.0') throw new IntegrationError('Ushbu Zenodo oqimi faqat CC BY 4.0 litsenziyasi uchun tayyorlangan.', 422);
  const bytes = await readArticlePdf(article.id);
  if (!bytes) throw new IntegrationError('Saqlangan maqola PDF fayli topilmadi.', 422);
  // One draft per article/environment: retries must reuse/reconcile this draft, not create duplicates.
  return runJob('zenodo', config.environment, article, 'draft-v1', async job => {
    const headers = { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' };
    const created = await providerJson(await fetch(`${config.base}/api/deposit/depositions`, { method: 'POST', headers, body: '{}', redirect: 'error', signal: AbortSignal.timeout(15000) }));
    if (!Number.isSafeInteger(created.id) || created.id < 1) throw new IntegrationError('Zenodo noto‘g‘ri depozit raqami qaytardi.', 502);
    const remote = { ...job, remote_id: String(created.id), remote_url: `${config.base}/deposit/${created.id}` };
    // Persist the remote ID before uploading; operators can recover an interrupted draft.
    await saveIntegrationJob(remote);
    const bucket = new URL(created.links?.bucket || '');
    if (bucket.origin !== config.base || !/^\/api\/files\/[a-zA-Z0-9-]+\/?$/.test(bucket.pathname) || bucket.username || bucket.password || bucket.search || bucket.hash) throw new IntegrationError('Zenodo yuklash manzili noto‘g‘ri.', 502);
    const upload = await fetch(`${bucket.toString().replace(/\/$/, '')}/agm-${article.id}.pdf`, { method: 'PUT', headers: { Authorization: headers.Authorization, 'Content-Type': 'application/octet-stream' }, body: Buffer.from(bytes), redirect: 'error', signal: AbortSignal.timeout(20000) });
    await providerJson(upload);
    const metadata = { upload_type: 'publication', publication_type: 'article', title: article.title_en!.trim(), description: `<p>${xml(article.abstract_en!.trim())}</p>`,
      creators: article.authors!.map(author => ({ name: author.full_name, affiliation: author.affiliation })),
      publication_date: article.publication_date, access_right: 'open', license: 'cc-by-4.0',
      keywords: article.keywords_en || [], journal_title: settings.journal_name,
      related_identifiers: [{ identifier: articleUrl(article), relation: 'isIdenticalTo', scheme: 'url' }],
      ...(article.doi ? { doi: article.doi } : {}),
    };
    await providerJson(await fetch(`${config.base}/api/deposit/depositions/${created.id}`, { method: 'PUT', headers, body: JSON.stringify({ metadata }), redirect: 'error', signal: AbortSignal.timeout(15000) }));
    return { ...remote, status: 'ready', message: 'PDF va metama’lumotlar Zenodo qoralamasiga yuklandi. Havolada tekshirib, nashrni Zenodo hisobida yakunlang.' };
  });
}
