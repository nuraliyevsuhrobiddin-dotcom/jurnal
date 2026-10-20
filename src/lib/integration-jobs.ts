import { createServerClient } from './supabase/server';
import { IntegrationError } from './integration-config';
import { mkdir, writeFile, readFile, rename, link, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

export interface IntegrationJob {
  id: string; article_id: string; provider: 'crossref' | 'zenodo'; environment: string;
  status: 'pending' | 'ready' | 'submitted' | 'failed' | 'unknown';
  remote_id?: string | null; remote_url?: string | null; message: string; created_at: string; updated_at: string;
}

const directory = () => path.join(process.env.JOURNAL_DATA_DIR || path.join(process.cwd(), '.data'), 'integration-jobs');
const missingTable = (error: { code?: string } | null) => error?.code === 'PGRST205' || error?.code === '42P01';
const storageKey = (id: string) => { filename(id); return `_integration-jobs/${id}.json`; };
const missingObject = (error: { statusCode?: string | number; status?: string | number }) => Number(error.statusCode || error.status) === 404;

async function readStoredJob(client: NonNullable<ReturnType<typeof createServerClient>>, id: string): Promise<IntegrationJob | null> {
  const { data, error } = await client.storage.from('journal-manuscripts').download(storageKey(id));
  if (error) {
    if (missingObject(error)) return null;
    throw new IntegrationError('Yopiq integratsiya jurnalini o‘qib bo‘lmadi.');
  }
  const job = JSON.parse(await data.text()) as IntegrationJob;
  if (job.id !== id) throw new IntegrationError('Integratsiya jurnali identifikatori mos emas.');
  return job;
}
function filename(id: string) {
  if (!/^[a-f0-9]{64}$/.test(id)) throw new Error('Invalid integration job ID');
  return path.join(directory(), `${id}.json`);
}

export async function getIntegrationJob(id: string): Promise<IntegrationJob | null> {
  const client = createServerClient();
  if (client) {
    const { data, error } = await client.from('integration_jobs').select('*').eq('id', id).maybeSingle();
    if (missingTable(error)) return readStoredJob(client, id);
    if (error) throw new IntegrationError('Integratsiya jurnali mavjud emas. 009 migratsiyasini qo‘llang.');
    return data as IntegrationJob | null;
  }
  try { return JSON.parse(await readFile(filename(id), 'utf8')) as IntegrationJob; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}

export async function claimIntegrationJob(job: IntegrationJob) {
  const client = createServerClient();
  if (client) {
    const { error } = await client.from('integration_jobs').insert(job);
    if (missingTable(error)) {
      const stored = await client.storage.from('journal-manuscripts').upload(storageKey(job.id), JSON.stringify(job), { contentType: 'application/json', upsert: false });
      if (stored.error && Number(stored.error.statusCode) === 409) return false;
      if (stored.error) throw new IntegrationError('Yopiq integratsiya jurnalini saqlab bo‘lmadi.');
      return true;
    }
    if (error?.code === '23505') return false;
    if (error) throw new IntegrationError('Integratsiya jurnalini saqlab bo‘lmadi. 009 migratsiyasini tekshiring.');
    return true;
  }
  await mkdir(directory(), { recursive: true });
  const target = filename(job.id);
  const temporary = `${target}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(job), { mode: 0o600 });
  try { await link(temporary, target); return true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false; throw error; }
  finally { await unlink(temporary); }
}

export async function saveIntegrationJob(job: IntegrationJob) {
  const client = createServerClient();
  if (client) {
    const { error } = await client.from('integration_jobs').update(job).eq('id', job.id);
    if (missingTable(error)) {
      const stored = await client.storage.from('journal-manuscripts').upload(storageKey(job.id), JSON.stringify(job), { contentType: 'application/json', upsert: true });
      if (stored.error) throw new IntegrationError('Integratsiya natijasini yopiq omborga saqlab bo‘lmadi.');
      return job;
    }
    if (error) throw new IntegrationError('Integratsiya natijasini saqlab bo‘lmadi. Provayderni tekshirmasdan takrorlamang.');
  } else {
    const target = filename(job.id);
    const temporary = `${target}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(job), { mode: 0o600 });
    await rename(temporary, target);
  }
  return job;
}
