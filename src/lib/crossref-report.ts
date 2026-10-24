import { crossrefConfig, IntegrationError } from './integration-config';
import { getIntegrationJob, saveIntegrationJob, type IntegrationJob } from './integration-jobs';
import { boundedBody } from './bounded-body';
import { DOMParser } from '@xmldom/xmldom';

/** Require the documented diagnostic envelope; never expand XML entities. */
export function interpretCrossrefReport(content: string, batchId: string): Pick<IntegrationJob, 'status' | 'message'> {
  const unknown = { status: 'unknown' as const, message: 'Crossref yakuniy hisoboti hali aniqlanmadi. Navbatni yoki hisobdagi depozit jurnalini tekshiring.' };
  if (/<!DOCTYPE|<!ENTITY/i.test(content)) return unknown;
  let invalid = false;
  const reject = () => { invalid = true; };
  let document;
  try { document = new DOMParser({ errorHandler: { warning: reject, error: reject, fatalError: reject } }).parseFromString(content, 'application/xml'); }
  catch { return unknown; }
  const root = document.documentElement;
  if (invalid || !root || root.tagName !== 'doi_batch_diagnostic') return unknown;
  const values = (name: string) => Array.from(root.getElementsByTagName(name)).map(node => node.textContent?.trim() || '');
  const batch = values('batch_id');
  if (batch.length !== 1 || batch[0] !== batchId) return unknown;
  const count = (name: string) => {
    const matches = values(name);
    return matches.length === 1 && /^\d+$/.test(matches[0]) ? Number(matches[0]) : NaN;
  };
  const total = count('record_count'), success = count('success_count'), failure = count('failure_count'), warnings = count('warning_count');
  if (![total, success, failure, warnings].every(Number.isSafeInteger) || total < 1 || success + failure + warnings !== total) return unknown;
  const records = Array.from(root.getElementsByTagName('record_diagnostic'));
  if (failure > 0 || records.some(record => record.getAttribute('status') === 'Failure')) {
    return { status: 'failed', message: `Crossref hisobotida ${failure} ta rad etish bor. Depozit jurnalidagi xatolarni tuzating; DOI tasdiqlanmadi.` };
  }
  if (warnings > 0 || records.some(record => record.getAttribute('status') === 'Warning')) return { status: 'unknown', message: 'Crossref konflikt yoki ogohlantirish qaytardi. Hisobdagi hisobotni ko‘rib chiqing; avtomatik tasdiqlanmadi.' };
  if (success !== total || records.length !== total || records.some(record => record.getAttribute('status') !== 'Success')) return unknown;
  return { status: 'ready', message: 'Crossref yakuniy hisoboti muvaffaqiyatli. DOI ro‘yxatga olish qayta ishlanishi tasdiqlandi.' };
}

export async function refreshCrossrefReport(articleId: string, jobId: string) {
  if (!/^[a-f0-9]{64}$/.test(jobId)) throw new IntegrationError('Depozit identifikatori noto‘g‘ri.', 400);
  const job = await getIntegrationJob(jobId);
  if (!job || job.article_id !== articleId || job.provider !== 'crossref') throw new IntegrationError('Crossref depoziti topilmadi.', 404);
  const config = crossrefConfig();
  if (config.environment !== job.environment) throw new IntegrationError('Depozit va joriy Crossref rejimi mos emas.', 409);
  if (!job.remote_id || !/^agm-[a-f0-9-]{36}$/.test(job.remote_id)) throw new IntegrationError('Depozit batch raqami saqlanmagan. Crossref hisobidagi jurnalni tekshiring.', 409);
  const url = new URL('/servlet/submissionDownload', config.url);
  // Crossref documents query credentials for this endpoint. Never log this URL,
  // follow redirects, return provider bodies, or persist credentials in the ledger.
  url.search = new URLSearchParams({ usr: config.username, pwd: config.password, doi_batch_id: job.remote_id, type: 'result' }).toString();
  let report;
  try {
    const response = await fetch(url, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!response.ok) { await response.body?.cancel(); throw new Error(); }
    const bytes = await boundedBody(response, 1024 * 1024);
    report = interpretCrossrefReport(new TextDecoder().decode(bytes), job.remote_id);
  } catch {
    // Keep an existing confirmed result if a later status lookup is unavailable.
    throw new IntegrationError('Crossref hisobotini olib bo‘lmadi. Ulanish va hisobni tekshiring; depozit qayta yuborilmadi.', 502);
  }
  if (report.status === 'ready' && config.environment === 'test') {
    report.message = 'Crossref TEST hisoboti muvaffaqiyatli. Bu haqiqiy production DOI ro‘yxatdan o‘tganini bildirmaydi.';
  }
  if (job.status === 'ready' && report.status === 'unknown') return job;
  return saveIntegrationJob({ ...job, ...report, updated_at: new Date().toISOString() });
}
