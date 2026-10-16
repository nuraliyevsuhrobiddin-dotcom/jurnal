import { MetadataRoute } from 'next';
import { getPublishedArticles, getAllIssues } from '@/lib/db';
import { connection } from 'next/server';
import { policyIds } from '@/types/policies';
import { SITE_URL } from '@/lib/site-url';
import { subjectCollections } from '@/lib/subjects';

const BASE_URL = SITE_URL;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const [articles, issues] = await Promise.all([getPublishedArticles(), getAllIssues()]);
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
  staticRoutes.push('/policies', '/submit', '/announcements', '/integrations');
  staticRoutes.push(...subjectCollections.map(subject => `/subjects/${subject.id}`));
  const sitemapEntries: MetadataRoute.Sitemap = [];

  // 1. Static pages across all 3 locales
  for (const route of staticRoutes) {
    for (const lang of locales) {
      sitemapEntries.push({
        url: `${BASE_URL}/${lang}${route}`,
        alternates: { languages: Object.fromEntries([...locales.map(code => [code, `${BASE_URL}/${code}${route}`]), ['x-default', `${BASE_URL}/en${route}`]]) },
        changeFrequency: route === '' || route === '/articles' ? 'daily' : 'monthly',
        priority: route === '' ? 1.0 : 0.8,
      });
    }
  }

  for (const issue of issues) {
    for (const lang of locales) sitemapEntries.push({
      url: `${BASE_URL}/${lang}/issue/${issue.id}`, lastModified: issue.updated_at,
      alternates: { languages: Object.fromEntries([...locales.map(code => [code, `${BASE_URL}/${code}/issue/${issue.id}`]), ['x-default', `${BASE_URL}/en/issue/${issue.id}`]]) },
      changeFrequency: 'weekly', priority: 0.8,
    });
  }
  // 2. Published articles across all 3 locales (NEVER drafts!)
  for (const article of articles) {
    for (const lang of locales) {
      sitemapEntries.push({
        url: `${BASE_URL}/${lang}/article/${article.slug}`,
        lastModified: article.updated_at || article.publication_date || undefined,
        alternates: { languages: Object.fromEntries([...locales.map(code => [code, `${BASE_URL}/${code}/article/${article.slug}`]), ['x-default', `${BASE_URL}/en/article/${article.slug}`]]) },
        changeFrequency: 'monthly',
        priority: 0.9,
      });
    }
  }

  return sitemapEntries;
}
