import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { journalStore } from './data-store';
import { createServerClient } from './supabase/server';
import { readArticlePdf } from './pdf/storage';
import type { Article, ArticleVersion } from '@/types/journal';

export async function archiveLocalVersion(previous: Article, note: string) {
  const revision = previous.revision || 1;
  if (journalStore.articleVersions.some(item => item.article_id === previous.id && item.revision === revision)) return;
  const id = randomUUID();
  const bytes = await readArticlePdf(previous.id);
  let pdfPath: string | undefined;
  if (bytes) {
    pdfPath = `versions/${id}.pdf`;
    const directory = path.join(process.env.JOURNAL_DATA_DIR || path.join(process.cwd(), '.data'), 'articles', 'versions');
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, `${id}.pdf`), bytes);
  }
  journalStore.articleVersions.push({ id, article_id: previous.id, revision, created_at: new Date().toISOString(), change_note: note, snapshot: structuredClone(previous), pdf_storage_path: pdfPath });
}

export async function getArticleVersions(id: string): Promise<ArticleVersion[]> {
  const client = createServerClient();
  if (client) {
    const { data, error } = await client.from('article_versions').select('*').eq('article_id', id).order('revision', { ascending: false }).limit(100);
    if (error) throw new Error('Versiyalar uchun 015 migratsiyasini qo‘llang.');
    return data as ArticleVersion[];
  }
  journalStore.refresh();
  return journalStore.articleVersions.filter(item => item.article_id === id).sort((a, b) => b.revision - a.revision);
}

export async function readVersionPdf(version: ArticleVersion) {
  if (!version.pdf_storage_path || !/^(?:[a-zA-Z0-9-]+\/)?(?:versions\/)?[a-zA-Z0-9-]+\.pdf$/.test(version.pdf_storage_path)) return null;
  const client = createServerClient();
  if (client) {
    const { data, error } = await client.storage.from('journal-pdfs').download(version.pdf_storage_path);
    if (error || !data) return null;
    return new Uint8Array(await data.arrayBuffer());
  }
  try { return await readFile(path.join(process.env.JOURNAL_DATA_DIR || path.join(process.cwd(), '.data'), 'articles', version.pdf_storage_path)); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}
