import { getPublishedArticles } from './db';
import { createServerClient } from './supabase/server';
import { findSubject, matchesSubject } from './subjects';
import type { Article } from '@/types/journal';
import { normalizeRemoteArticle } from './remote-db';

export async function getArticlePage(options: { query?: string; issueId?: string; subject?: string; page?: string }) {
  const requested = Number(options.page || 1);
  const page = Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, 100000) : 1;
  const size = 12;
  const subject = findSubject(options.subject);
  if (subject) {
    const all = await getPublishedArticles({ query: options.query, issueId: options.issueId });
    const filtered = all.filter(article => matchesSubject(article, subject));
    return { articles: filtered.slice((page - 1) * size, page * size), total: filtered.length, page, size };
  }
  const client = createServerClient();
  if (client) {
    const { data, error } = await client.rpc('published_article_page', {
      search_query: (options.query || '').trim().slice(0, 300),
      selected_issue: options.issueId || null,
      subject_terms: [],
      page_number: page, page_size: size,
    });
    if (error) throw new Error('Article catalog unavailable. Apply migration 008.');
    return { articles: (data.items as Article[]).map(normalizeRemoteArticle), total: Number(data.total), page, size };
  }
  const all = await getPublishedArticles({ query: options.query, issueId: options.issueId });
  const filtered = all;
  return { articles: filtered.slice((page - 1) * size, page * size), total: filtered.length, page, size };
}

export async function getAdminArticlePage(options: { query?: string; status?: string; page?: string }) {
  const number = Number(options.page || 1);
  const page = Number.isSafeInteger(number) && number > 0 ? Math.min(number, 100000) : 1;
  const size = 20;
  const client = createServerClient();
  if (client) {
    const { data, error } = await client.rpc('admin_article_page', {
      search_query: (options.query || '').slice(0, 300), selected_issue: null,
      selected_status: options.status || null, subject_terms: [], page_number: page, page_size: size,
    });
    if (error) throw new Error('Apply migration 008 before using the article catalog.');
    return { articles: (data.items as Article[]).map(normalizeRemoteArticle), total: Number(data.total), page, size };
  }
  const { getAllArticlesAdmin } = await import('./db');
  const all = await getAllArticlesAdmin();
  const query = (options.query || '').toLocaleLowerCase();
  const filtered = all.filter(article => (!options.status || article.status === options.status) && (!query ||
    [article.title_uz, article.title_en, article.title_ru, ...(article.authors || []).map(author => author.full_name)].some(text => text?.toLocaleLowerCase().includes(query))));
  return { articles: filtered.slice((page - 1) * size, page * size), total: filtered.length, page, size };
}
