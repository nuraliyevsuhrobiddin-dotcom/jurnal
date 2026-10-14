import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createServerClient } from './supabase/server';

interface ManuscriptMetadata { id: string; name: string; extension: 'pdf' | 'docx'; contentType: string; size: number }
const contentTypes = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
const directory = () => path.join(process.env.JOURNAL_DATA_DIR || path.join(process.cwd(), '.data'), 'manuscripts');
function safeId(id: string) { if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Invalid manuscript ID'); return id; }

export async function saveManuscript(file: File, bytes: Uint8Array, extension: 'pdf' | 'docx'): Promise<ManuscriptMetadata> {
  const metadata: ManuscriptMetadata = { id: randomUUID(), name: path.basename(file.name).replace(/[\r\n]/g, '').slice(0, 150), extension, contentType: contentTypes[extension], size: bytes.length };
  const client = createServerClient();
  if (client) {
    const object = `${metadata.id}.${extension}`;
    const { error } = await client.storage.from('journal-manuscripts').upload(object, bytes, { contentType: metadata.contentType, upsert: false });
    if (error) throw new Error(error.message);
    const meta = await client.storage.from('journal-manuscripts').upload(`${metadata.id}.json`, JSON.stringify(metadata), { contentType: 'application/json', upsert: false });
    if (meta.error) { await client.storage.from('journal-manuscripts').remove([object]); throw new Error(meta.error.message); }
  } else {
    await mkdir(directory(), { recursive: true });
    await writeFile(path.join(directory(), `${metadata.id}.${extension}`), bytes);
    try { await writeFile(path.join(directory(), `${metadata.id}.json`), JSON.stringify(metadata), 'utf8'); }
    catch (cause) { await unlink(path.join(directory(), `${metadata.id}.${extension}`)); throw cause; }
  }
  return metadata;
}

export async function readManuscript(id: string): Promise<{ metadata: ManuscriptMetadata; bytes: Uint8Array } | null> {
  safeId(id);
  const client = createServerClient();
  if (client) {
    const meta = await client.storage.from('journal-manuscripts').download(`${id}.json`);
    if (meta.error || !meta.data) return null;
    const metadata = JSON.parse(await meta.data.text()) as ManuscriptMetadata;
    if (metadata.id !== id || !Object.hasOwn(contentTypes, metadata.extension)) throw new Error('Invalid manuscript metadata');
    const object = await client.storage.from('journal-manuscripts').download(`${id}.${metadata.extension}`);
    if (object.error || !object.data) throw new Error('Manuscript file unavailable');
    return { metadata, bytes: new Uint8Array(await object.data.arrayBuffer()) };
  }
  try {
    const metadata = JSON.parse(await readFile(path.join(directory(), `${id}.json`), 'utf8')) as ManuscriptMetadata;
    if (metadata.id !== id || !Object.hasOwn(contentTypes, metadata.extension)) throw new Error('Invalid manuscript metadata');
    return { metadata, bytes: await readFile(path.join(directory(), `${id}.${metadata.extension}`)) };
  } catch (cause) { if ((cause as NodeJS.ErrnoException).code === 'ENOENT') return null; throw cause; }
}

export async function removeManuscript(metadata: ManuscriptMetadata): Promise<void> {
  safeId(metadata.id);
  const names = [`${metadata.id}.${metadata.extension}`, `${metadata.id}.json`];
  const client = createServerClient();
  if (client) { const { error } = await client.storage.from('journal-manuscripts').remove(names); if (error) throw new Error(error.message); }
  else { for (const name of names) { try { await unlink(path.join(directory(), name)); } catch (cause) { if ((cause as NodeJS.ErrnoException).code !== 'ENOENT') throw cause; } } }
}
