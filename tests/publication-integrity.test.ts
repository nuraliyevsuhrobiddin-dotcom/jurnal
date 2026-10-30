import { afterEach, describe, expect, it } from 'vitest';
import { journalStore } from '@/lib/data-store';
import { certificatePublicationState, isPublicArticle } from '@/lib/publication-state';
import { getArticleBySlug, updateArticleStatus, getCatalogArticles } from '@/lib/db';
import { getArticleVersions } from '@/lib/article-versions';
import { getCollectionSummaries, rememberLocalReleases } from '@/lib/issues/collections';
import type { Article, Certificate } from '@/types/journal';

const articles = structuredClone(journalStore.articles);
const releases = { ...journalStore.collectionReleases };
afterEach(() => { journalStore.articles = structuredClone(articles); journalStore.collectionReleases = { ...releases }; journalStore.articleVersions = []; });
const article = (): Article => ({ ...structuredClone(articles[0]), issue: journalStore.issues[0], status: 'published', publication_date: '2026-10-30', original_language: 'uz' });
function certificate(a: Article): Certificate { return { ...journalStore.certificates[0], article_id:a.id, author_name:a.authors![0].full_name, author_affiliation:a.authors![0].affiliation, article_title:a.title_uz, issue_volume:a.issue!.volume, issue_number:a.issue!.issue_number, issue_year:a.issue!.year, issue_date:a.publication_date!, status:'valid' }; }

describe('Publication integrity', () => {
  it('suspends certificates when a publication is unavailable or its metadata changes without revoking the stored record', () => {
    const a=article(), c=certificate(a);
    expect(certificatePublicationState(c,a).valid).toBe(true);
    expect(certificatePublicationState(c,{...a,status:'approved'}).valid).toBe(false);
    expect(certificatePublicationState(c,{...a,status:'withdrawn'}).valid).toBe(false);
    expect(certificatePublicationState(c,{...a,title_uz:'Corrected title'}).valid).toBe(false);
    expect(c.status).toBe('valid');
  });
  it('keeps a withdrawn published record public, stores its previous version and requires an explanation', async () => {
    const a=article(); journalStore.articles=[a];
    await expect(updateArticleStatus(a.id,'withdrawn')).rejects.toThrow('sababini');
    const updated=await updateArticleStatus(a.id,'withdrawn','Incorrect conclusions');
    expect(updated?.first_published_at).toBeTruthy();
    expect(await getArticleBySlug(a.slug)).toMatchObject({status:'withdrawn'});
    expect((await getArticleVersions(a.id))[0].snapshot.status).toBe('published');
    expect(isPublicArticle({...a,status:'withdrawn',first_published_at:undefined})).toBe(false);
  });
  it('preserves released collections after a withdrawal and keeps an unrelated issue private', async () => {
    const a=article();
    journalStore.articles=Array.from({length:25},(_,i)=>({...a,id:`stable-${i}`,subject_id:'natural-sciences'}));
    rememberLocalReleases(journalStore.articles);
    journalStore.articles[0].status='withdrawn';
    expect(await getCatalogArticles()).toHaveLength(24);
    expect((await getCollectionSummaries(a.issue_id)).find(item=>item.subject_id==='natural-sciences')?.released_at).toBeTruthy();
  });
});
