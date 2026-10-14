import { MetadataRoute } from 'next';
import { getPublishedArticles } from '@/lib/db';
import { connection } from 'next/server';
import { policyIds, POLICY_DATE } from '@/types/policies';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://agmjoural.uz';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const articles = await getPublishedArticles();
  const locales = ['uz', 'en', 'ru'] as const;

  const staticRoutes = [
    '',
    '/about',
    '/articles',
    '/current',
    '/archive',
    '/editorial-board',
    '/guidelines',
    '/peer-review',
    '/ethics',
    '/plagiarism',
    '/open-access',
    '/apc',
    '/indexing',
    '/contact',
    '/privacy',
    '/terms',
  ];

  for (const id of policyIds) if (!staticRoutes.includes(`/${id}`)) staticRoutes.push(`/${id}`);
  staticRoutes.push('/policies', '/submit');
  const sitemapEntries: MetadataRoute.Sitemap = [];

  // 1. Static pages across all 3 locales
  for (const route of staticRoutes) {
    for (const lang of locales) {
      sitemapEntries.push({
        url: `${BASE_URL}/${lang}${route}`,
        lastModified: POLICY_DATE,
        changeFrequency: route === '' || route === '/articles' ? 'daily' : 'monthly',
        priority: route === '' ? 1.0 : 0.8,
      });
    }
  }

  // 2. Published articles across all 3 locales (NEVER drafts!)
  for (const article of articles) {
    for (const lang of locales) {
      sitemapEntries.push({
        url: `${BASE_URL}/${lang}/article/${article.slug}`,
        lastModified: article.publication_date || '2026-02-15',
        changeFrequency: 'monthly',
        priority: 0.9,
      });
    }
  }

  // 3. Certificate verification route
  sitemapEntries.push({
    url: `${BASE_URL}/verify-certificate`,
    lastModified: '2026-02-15',
    changeFrequency: 'monthly',
    priority: 0.7,
  });

  return sitemapEntries;
}
