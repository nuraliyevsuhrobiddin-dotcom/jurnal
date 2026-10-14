import { createServerClient } from './supabase/server';
import type { Article, Issue, JournalSettings } from '@/types/journal';

/** SQL NULL optional columns correspond to omitted values in the editorial form schema. */
export function normalizeRemoteArticle(article: Article): Article {
  const withoutNull = <T extends object>(value: T): T => Object.fromEntries(Object.entries(value).filter(([, field]) => field !== null)) as T;
  return { ...withoutNull(article), authors: (article.authors || []).map(withoutNull) };
}


export async function remoteArticles(): Promise<Article[] | null> {
  const client = createServerClient();
  if (!client) return null;
  const { data, error } = await client.from('articles').select('*, authors:article_authors(*), issue:issues(*)').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Article[]).map(normalizeRemoteArticle);
}

export async function remoteRows<T extends object>(table: string): Promise<T[] | null> {
  const client = createServerClient();
  if (!client) return null;
  const { data, error } = await client.from(table).select('*');
  if (error) throw new Error(error.message);
  return data as T[];
}

export async function remoteSave(table: string, value: object): Promise<boolean> {
  const client = createServerClient();
  if (!client) return false;
  const { error } = await client.from(table).upsert(value);
  if (error) throw new Error(error.message);
  return true;
}

export async function remoteSaveArticle(article: Article): Promise<boolean> {
  const client = createServerClient();
  if (!client) return false;
  const { authors = [], issue: _issue, ...record } = article;
  void _issue;
  const { error } = await client.rpc('save_journal_article', { article_data: record, author_data: authors });
  if (error) throw new Error(error.message);
  return true;
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
