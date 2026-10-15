import { describe, it, expect, vi } from 'vitest';
import { getPublishedArticles, getAllArticlesAdmin, createArticle, updateArticleStatus, updateArticle } from '@/lib/db';
import { journalStore } from '@/lib/data-store';
vi.mock('@/lib/pdf/storage', () => ({ readArticlePdf: vi.fn(async () => {
  const { PDFDocument } = await import('pdf-lib');
  const pdf = await PDFDocument.create(); pdf.addPage(); pdf.addPage(); return pdf.save();
}) }));

describe('Articles Management & Lifecycle Tests', () => {
  it('should only return published articles to the public, hiding drafts and under_review', async () => {
    const publicArticles = await getPublishedArticles();

    // Every public article must have status === 'published'
    expect(publicArticles.length).toBeGreaterThan(0);
    publicArticles.forEach(article => {
      expect(article.status).toBe('published');
    });

    // Check that draft article is not included in public articles
    const draft = journalStore.articles.find(a => a.status === 'draft' || a.status === 'under_review');
    if (draft) {
      const foundInPublic = publicArticles.some(a => a.id === draft.id);
      expect(foundInPublic).toBe(false);
    }
  });

  it('should allow admin to view all articles including drafts and under_review', async () => {
    const adminArticles = await getAllArticlesAdmin();
    expect(adminArticles.length).toBeGreaterThanOrEqual(journalStore.articles.length);

    const statuses = adminArticles.map(a => a.status);
    expect(statuses).toContain('published');
    expect(statuses).toContain('under_review');
  });

  it('should successfully create a new article with multiple authors and validate slug generation', async () => {
    const initialCount = journalStore.articles.length;

    const newArticle = await createArticle({
      slug: `test-research-${Date.now()}`,
      original_language: 'uz',
      title_uz: 'Test ilmiy maqola sarlavhasi',
      title_en: 'Test Research Article Title',
      abstract_uz: 'Ushbu tadqiqotda sinov maqolasining annotatsiyasi keltirilgan.',
      keywords_uz: ['test', 'tadqiqot'],
      article_type: 'original_research',
      status: 'draft',
      license: 'CC BY 4.0',
      references_list: ['Test Reference 1'],
      authors: [
        {
          id: 'auth-test-1',
          article_id: '',
          full_name: 'Test Muallif 1',
          affiliation: 'O‘zMU',
          country: 'O‘zbekiston',
          is_corresponding: true,
          order_index: 1,
        },
        {
          id: 'auth-test-2',
          article_id: '',
          full_name: 'Test Muallif 2',
          affiliation: 'TATU',
          country: 'O‘zbekiston',
          is_corresponding: false,
          order_index: 2,
        }
      ]
    });

    expect(newArticle.id).toBeDefined();
    expect(journalStore.articles.length).toBe(initialCount + 1);
    expect(newArticle.authors?.length).toBe(2);
    expect(newArticle.status).toBe('draft');
  });

  it('should transition article status from draft -> under_review -> approved -> published', async () => {
    const testArticle = await createArticle({
      slug: `status-flow-${Date.now()}`,
      original_language: 'uz',
      title_uz: 'Status Flow Test Maqolasi',
      abstract_uz: 'Status o‘zgarishini tekshirish uchun test annotatsiya.',
      keywords_uz: ['status', 'test'],
      article_type: 'original_research',
      status: 'draft',
      license: 'CC BY 4.0',
      references_list: [],
      authors: []
    });

    expect(testArticle.status).toBe('draft');

    // 1. Move to under_review
    const reviewArticle = await updateArticleStatus(testArticle.id, 'under_review');
    expect(reviewArticle?.status).toBe('under_review');

    // 2. Approve
    const approvedArticle = await updateArticleStatus(testArticle.id, 'approved');
    expect(approvedArticle?.status).toBe('approved');

    // An approved draft still cannot bypass the publication checks.
    await expect(updateArticleStatus(testArticle.id, 'published')).rejects.toThrow();
    await updateArticle(testArticle.id, { authors: [{ id: 'test-author', article_id: testArticle.id, full_name: 'Test Author', affiliation: 'Research University', country: 'UZ', is_corresponding: true, order_index: 1 }], issue_id: journalStore.issues[0].id,
      page_first: 1, page_last: 2, pdf_url: `/api/articles/${testArticle.id}/pdf`, pdf_file_size: 1000 });
    // 3. Publish only after metadata and a readable full PDF are present.
    const publishedArticle = await updateArticleStatus(testArticle.id, 'published');
    expect(publishedArticle?.status).toBe('published');
    expect(publishedArticle?.publication_date).toBeDefined();
  });
});
