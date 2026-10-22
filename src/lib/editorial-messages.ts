import { mkdir, readFile, readdir, writeFile, link, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createServerClient } from './supabase/server';

export interface EditorialMessage {
  id: string; article_id: string; body: string;
  kind: 'note' | 'revision_requested'; created_at: string;
}
const directory = () => path.join(process.env.JOURNAL_DATA_DIR || path.join(process.cwd(), '.data'), 'editorial-messages');
export async function editorialMessages(articleId: string): Promise<EditorialMessage[]> {
  const client = createServerClient();
  if (client) {
    const { data, error } = await client.from('editorial_messages').select('*').eq('article_id', articleId).order('created_at');
    if (error) throw new Error('Editorial messages unavailable. Apply migration 011.');
    return data;
  }
  try {
    const files = (await readdir(directory())).filter(name => /^[a-f0-9-]+\.json$/i.test(name));
    const items = await Promise.all(files.map(async name => JSON.parse(await readFile(path.join(directory(), name), 'utf8')) as EditorialMessage));
    return items.filter(item => item.article_id === articleId).sort((a, b) => a.created_at.localeCompare(b.created_at));
  } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
}
export async function saveEditorialMessage(message: EditorialMessage) {
  const client = createServerClient();
  if (client) {
    const { error } = await client.from('editorial_messages').upsert(message, { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw new Error('Editorial message not saved. Apply migration 011.');
    const { data, error: readError } = await client.from('editorial_messages').select('*').eq('id', message.id).single();
    if (readError || data.article_id !== message.article_id) throw new Error('Editorial message conflict');
    return data as EditorialMessage;
  }
  await mkdir(directory(), { recursive: true });
  const filename = path.join(directory(), `${message.id}.json`);
  const temporary = `${filename}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(message), { mode: 0o600 });
  try { await link(temporary, filename); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
  finally { await unlink(temporary); }
  const saved = JSON.parse(await readFile(filename, 'utf8')) as EditorialMessage;
  if (saved.article_id !== message.article_id) throw new Error('Editorial message conflict');
  return saved;
}
