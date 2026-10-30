import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { createServerClient } from '@/lib/supabase/server';
import { journalStore } from '@/lib/data-store';

function filename(id: string) {
  if (!/^[a-zA-Z0-9-]+$/.test(id)) throw new Error('Invalid article ID');
  return `${id}.pdf`;
}

export async function saveArticlePdf(id: string, bytes: Uint8Array) {
  filename(id);
  const client = createServerClient();
  if (client) {
    const immutableName = `${id}/${randomUUID()}.pdf`;
    const { error } = await client.storage.from('journal-pdfs').upload(immutableName, bytes, { contentType: 'application/pdf', upsert: false });
    if (error) throw new Error(error.message);
    return immutableName;
  }
  const directory = path.join(process.env.JOURNAL_DATA_DIR || path.join(process.cwd(), '.data'), 'articles');
  const relativePath = `${id}/${randomUUID()}.pdf`;
  await mkdir(path.join(directory, id), { recursive: true });
  const destination = path.join(directory, relativePath);
  const temporary = `${destination}.${randomUUID()}.tmp`;
  try { await writeFile(temporary, bytes); await rename(temporary, destination); }
  catch (cause) { await unlink(temporary).catch(() => {}); throw cause; }
  return relativePath;
}

export async function removeArticlePdf(id: string, storedPath?: string) {
  const name = storedPath || filename(id);
  if (!/^(?:[a-zA-Z0-9-]+\/)?[a-zA-Z0-9-]+\.pdf$/.test(name)) throw new Error('Invalid publication PDF path');
  const client = createServerClient();
  if (client) { const { error } = await client.storage.from('journal-pdfs').remove([name]); if (error) throw new Error(error.message); return; }
  try { await unlink(path.join(process.env.JOURNAL_DATA_DIR || path.join(process.cwd(), '.data'), 'articles', name)); }
  catch (cause) { if ((cause as NodeJS.ErrnoException).code !== 'ENOENT') throw cause; }
}

export async function readArticlePdf(id: string): Promise<Uint8Array | null> {
  const name = filename(id);
  const client = createServerClient();
  if (client) {
    const article = await client.from('articles').select('pdf_storage_path').eq('id', id).maybeSingle();
    if (article.error) throw new Error(article.error.message);
    const location = article.data?.pdf_storage_path || name;
    if (!/^(?:[a-zA-Z0-9-]+\/)?[a-zA-Z0-9-]+\.pdf$/.test(location)) throw new Error('Invalid publication PDF path');
    const { data, error } = await client.storage.from('journal-pdfs').download(location);
    if (error || !data) return null;
    return new Uint8Array(await data.arrayBuffer());
  }
  try {
    journalStore.refresh();
    const location = journalStore.articles.find(article => article.id === id)?.pdf_storage_path || name;
    if (!/^(?:[a-zA-Z0-9-]+\/)?[a-zA-Z0-9-]+\.pdf$/.test(location)) throw new Error('Invalid publication PDF path');
    return await readFile(path.join(process.env.JOURNAL_DATA_DIR || path.join(process.cwd(), '.data'), 'articles', location));
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw cause;
  }
}
