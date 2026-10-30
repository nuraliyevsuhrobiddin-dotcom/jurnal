import { journalStore } from '@/lib/data-store';
import { createServerClient } from '@/lib/supabase/server';
import { resolveSubjectId, subjectCollections } from '@/lib/subjects';
import { MIN_COLLECTION_ARTICLES } from './collection-policy';
import type { Article, CollectionSummary } from '@/types/journal';

export const collectionKey = (issue: string, subject: string) => `${issue}:${subject}`;

export function rememberLocalReleases(articles: Article[]) {
  const counts = new Map<string, number>();
  for (const article of articles) if (article.status === 'published' && article.issue_id) {
    const key = collectionKey(article.issue_id, resolveSubjectId(article));
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  for (const [key, count] of counts) if (count >= MIN_COLLECTION_ARTICLES) journalStore.collectionReleases[key] ||= new Date().toISOString();
}

export async function getCollectionSummaries(issueId?: string): Promise<CollectionSummary[]> {
  const client = createServerClient();
  if (client) {
    const { data, error } = await client.rpc('journal_collection_summary', { selected_issue: issueId || null });
    if (error) throw new Error('Yo‘nalish to‘plamlari uchun 015 migratsiyasini qo‘llang.');
    return data as CollectionSummary[];
  }
  journalStore.refresh();
  rememberLocalReleases(journalStore.articles);
  journalStore.persist();
  return journalStore.issues.filter(issue => !issueId || issue.id === issueId).flatMap(issue => subjectCollections.map(subject => ({
    issue_id: issue.id, subject_id: subject.id,
    published_count: journalStore.articles.filter(article => article.issue_id === issue.id && article.status === 'published' && resolveSubjectId(article) === subject.id).length,
    released_at: journalStore.collectionReleases[collectionKey(issue.id, subject.id)] || null,
  })));
}
