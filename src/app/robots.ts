import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site-url';

const BASE_URL = SITE_URL;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/admin', '/private', '/track/', '/staff/', '/reviewer', '/api/staff/', '/api/reviewer/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
