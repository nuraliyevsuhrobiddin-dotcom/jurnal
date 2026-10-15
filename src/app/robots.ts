import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site-url';

const BASE_URL = SITE_URL;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/admin', '/private'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
