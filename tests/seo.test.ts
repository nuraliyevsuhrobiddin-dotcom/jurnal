import { describe, it, expect } from 'vitest';
import { getArticleMetadata, generateArticleJsonLd } from '@/lib/seo';
import { Article, JournalSettings } from '@/types/journal';

describe('Google Scholar Metadata & SEO Tests', () => {
  const mockSettings: JournalSettings = {
    journal_name: 'AGM Journal',
    tagline: 'Scientific Journal',
    publisher: 'AGM Scientific Publishing Academy',
    issn_online: '2959-5678',
    established_year: 2026,
    contact_email: 'editorial@agmjoural.uz',
  };

  const mockArticle: Article = {
    id: 'art-seo-1',
    slug: 'machine-learning-in-macroeconomics',
    original_language: 'uz',
    title_uz: 'Makroiqtisodiyotda mashinali o‘rganish',
    title_en: 'Machine Learning in Macroeconomics',
    abstract_uz: 'O‘zbekcha annotatsiya.',
    abstract_en: 'English research abstract.',
    keywords_uz: ['iqtisod', 'AI'],
    keywords_en: ['economics', 'AI'],
    article_type: 'original_research',
    status: 'published',
    publication_date: '2026-02-15',
    page_first: 1,
    page_last: 12,
    doi: '10.5281/zenodo.agm.2026.0101',
    license: 'CC BY 4.0',
    references_list: ['Reference 1'],
    views_count: 50,
    downloads_count: 20,
    created_at: '2026-02-15T00:00:00Z',
    updated_at: '2026-02-15T00:00:00Z',
    authors: [
      {
        id: 'auth-1',
        article_id: 'art-seo-1',
        full_name: 'Prof. Alisher Qodirov',
        affiliation: 'TATU',
        country: 'O‘zbekiston',
        is_corresponding: true,
        order_index: 1,
      },
      {
        id: 'auth-2',
        article_id: 'art-seo-1',
        full_name: 'Dr. John Doe',
        affiliation: 'Oxford University',
        country: 'UK',
        is_corresponding: false,
        order_index: 2,
      }
    ],
    issue: {
      id: 'iss-1',
      volume: 1,
      issue_number: 1,
      year: 2026,
      publication_date: '2026-02-15',
      is_current: true,
      created_at: '2026-02-15T00:00:00Z',
      updated_at: '2026-02-15T00:00:00Z',
    }
  };

  it('should generate complete Google Scholar citation meta tags', () => {
    const meta = getArticleMetadata(mockArticle, 'en', mockSettings);
    const other = meta.other as Record<string, string | string[]>;

    expect(other).toBeDefined();
    expect(other['citation_title']).toBe('Machine Learning in Macroeconomics');
    expect(other['citation_journal_title']).toBe('AGM Journal');
    expect(other['citation_volume']).toBe('1');
    expect(other['citation_issue']).toBe('1');
    expect(other['citation_firstpage']).toBe('1');
    expect(other['citation_lastpage']).toBe('12');
    expect(other['citation_doi']).toBe('10.5281/zenodo.agm.2026.0101');
    expect(other['citation_pdf_url']).toContain('/api/articles/art-seo-1/pdf');

    // Multiple authors tags
    expect(other['citation_author']).toEqual([
      'Prof. Alisher Qodirov',
      'Dr. John Doe',
    ]);
  });

  it('should generate multilingual hreflang and canonical URLs', () => {
    const meta = getArticleMetadata(mockArticle, 'uz', mockSettings);
    expect(meta.alternates?.canonical).toContain('/uz/article/machine-learning-in-macroeconomics');
    expect(meta.alternates?.languages?.['uz']).toContain('/uz/article/machine-learning-in-macroeconomics');
    expect(meta.alternates?.languages?.['en']).toContain('/en/article/machine-learning-in-macroeconomics');
    expect(meta.alternates?.languages?.['ru']).toContain('/ru/article/machine-learning-in-macroeconomics');
  });

  it('should generate valid JSON-LD structured data for ScholarlyArticle', () => {
    const jsonLd = generateArticleJsonLd(mockArticle, mockSettings);
    expect(jsonLd['@type']).toBe('ScholarlyArticle');
    expect(jsonLd.headline).toBe('Machine Learning in Macroeconomics');
    expect(jsonLd.datePublished).toBe('2026-02-15');
    expect(jsonLd.author.length).toBe(2);
    expect(jsonLd.author[0].name).toBe('Prof. Alisher Qodirov');
    expect(jsonLd.isPartOf.name).toBe('AGM Journal');
  });
});
