import { createServerClient } from './supabase/server';
import type { Article, Issue, JournalSettings } from '@/types/journal';
import { readSubjectMetadata, writeSubjectMetadata, resolveSubjectId } from './subjects';

/** SQL NULL optional columns correspond to omitted values in the editorial form schema. */
export function normalizeRemoteArticle(article: Article): Article {
  const withoutNull = <T extends object>(value: T): T => Object.fromEntries(Object.entries(value).filter(([, field]) => field !== null)) as T;
  const metadata = readSubjectMetadata(article.submission_notes);
  // The indexed DB column is the resolved subject. Only the marker represents a
  // manual decision; automatic assignments must still follow future title edits.
  return { ...withoutNull(article), ...metadata, subject_id: metadata.subject_id, authors: (article.authors || []).map(withoutNull) };
}


export async function remoteArticles(): Promise<Article[] | null> {
  const client = createServerClient();
  if (!client) return null;
  const articles: Article[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from('articles').select('*, authors:article_authors(*), issue:issues(*)').order('created_at', { ascending: false }).order('id').range(offset,offset+499);
    if (error) throw new Error(error.message);
    articles.push(...(data as Article[]).map(normalizeRemoteArticle));
    if (data.length < 500) return articles;
  }
}

export async function remoteRows<T extends object>(table: string): Promise<T[] | null> {
  const client = createServerClient();
  if (!client) return null;
  const rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from(table).select('*').order('id').range(offset, offset + 499);
    if (error) throw new Error(error.message);
    rows.push(...data as T[]);
    if (data.length < 500) return rows;
  }
}

export async function remoteSave(table: string, value: object): Promise<boolean> {
  const client = createServerClient();
  if (!client) return false;
  const { error } = await client.from(table).upsert(value);
  if (error) throw new Error(error.message);
  return true;
}

export class ArticleConflictError extends Error {}

export async function remoteSaveArticle(article: Article): Promise<Article | false> {
  const client = createServerClient();
  if (!client) return false;
  const { authors = [], issue: _issue, subject_id, ...record } = article;
  record.submission_notes = writeSubjectMetadata(subject_id, record.submission_notes);
  void _issue;
  const { data, error } = await client.rpc('save_journal_article', { article_data: { ...record, subject_id: resolveSubjectId(article) }, author_data: authors });
  if (error) {
    if (error.code === '23P01') throw new ArticleConflictError('Bu sahifalar boshqa nashrga ajratilgan. Bo‘sh sahifa diapazonini tanlang.');
    if (error.code === '40001') throw new ArticleConflictError('Maqola boshqa muharrir tomonidan yangilangan. Sahifani yangilang va qayta saqlang.');
    throw new Error(error.message);
  }
  return data ? normalizeRemoteArticle(data as Article) : article;
}

export async function remoteSaveIssue(issue: Issue): Promise<boolean> {
  const client = createServerClient();
  if (!client) return false;
  const { articles_count: _count, ...record } = issue;
  void _count;
  const { error } = await client.rpc('save_journal_issue', { issue_data: record });
  if (error) throw new Error(error.message);
  return true;
}

export async function remoteSettings(): Promise<JournalSettings | null> {
  const client = createServerClient();
  if (!client) return null;
  const { data, error } = await client.from('journal_settings').select('value').eq('key', 'general').maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Journal settings missing. Run supabase/seed.sql before launch.');
  return data.value as JournalSettings;
}

export async function remoteSaveSettings(settings: JournalSettings): Promise<boolean> {
  const client = createServerClient();
  if (!client) return false;
  const { error } = await client.from('journal_settings').upsert({ key: 'general', value: settings }, { onConflict: 'key' });
  if (error) throw new Error(error.message);
  return true;
}
