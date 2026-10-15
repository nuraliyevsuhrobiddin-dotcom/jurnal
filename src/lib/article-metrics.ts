import type { NextRequest } from 'next/server';
import { createServerClient } from './supabase/server';
import { consumeLimit, requestIdentity } from './request-limit';
import { journalStore } from './data-store';

export async function recordArticleMetric(request: NextRequest, id: string, metric: 'views_count' | 'downloads_count') {
  try {
    if (await consumeLimit(`metric:${id}:${metric}`, requestIdentity(request), 1, 3600)) return;
    const client = createServerClient();
    if (client) {
      const { error } = await client.rpc('increment_article_metric', { article_uuid: id, metric_name: metric });
      if (error) throw new Error(error.message);
    } else {
      journalStore.refresh();
      const article = journalStore.articles.find(article => article.id === id && article.status === 'published');
      if (article) { article[metric]++; journalStore.persist(); }
    }
  } catch (error) {
    // Analytics must never prevent reading or downloading research.
    console.error('Article metric:', error);
  }
}
