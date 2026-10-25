import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { createServerClient } from '@/lib/supabase/server';

function filename(id: string) {
  if (!/^[a-zA-Z0-9-]+$/.test(id)) throw new Error('Invalid article ID');
  return `${id}.pdf`;
}

export async function saveArticlePdf(id: string, bytes: Uint8Array) {
  const name = filename(id);
  const client = createServerClient();
  if (client) {
    const { error } = await client.storage.from('journal-pdfs').upload(name, bytes, { contentType: 'application/pdf', upsert: true });
    if (error) throw new Error(error.message);
    return;
  }
  const directory = path.join(process.env.JOURNAL_DATA_DIR || path.join(process.cwd(), '.data'), 'articles');
  await mkdir(directory, { recursive: true });
  const destination = path.join(directory, name);
  const temporary = `${destination}.${randomUUID()}.tmp`;
  try { await writeFile(temporary, bytes); await rename(temporary, destination); }
  catch (cause) { await unlink(temporary).catch(() => {}); throw cause; }
}

export async function removeArticlePdf(id: string) {
  const name = filename(id);
  const client = createServerClient();
  if (client) { const { error } = await client.storage.from('journal-pdfs').remove([name]); if (error) throw new Error(error.message); return; }
  try { await unlink(path.join(process.env.JOURNAL_DATA_DIR || path.join(process.cwd(), '.data'), 'articles', name)); }
  catch (cause) { if ((cause as NodeJS.ErrnoException).code !== 'ENOENT') throw cause; }
}

export async function readArticlePdf(id: string): Promise<Uint8Array | null> {
  const name = filename(id);
  const client = createServerClient();
  if (client) {
    const { data, error } = await client.storage.from('journal-pdfs').download(name);
    if (error || !data) return null;
    return new Uint8Array(await data.arrayBuffer());
  }
  try {
    return await readFile(path.join(process.env.JOURNAL_DATA_DIR || path.join(process.cwd(), '.data'), 'articles', name));
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw cause;
  }
}
