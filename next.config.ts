import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async headers() {
    return ['/staff/:path*', '/reviewer/:path*', '/api/staff/:path*', '/api/reviewer/:path*'].map(source => ({
      source,
      headers: [
        { key: 'Cache-Control', value: 'private, no-store' },
        { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
      ],
    }));
  },
  outputFileTracingIncludes: {
    '/api/**': ['./public/fonts/*.ttf', './public/images/issues/*.png', './public/brands/google-scholar.svg', './public/brands/crossref.svg', './public/brands/zenodo.png', './public/brands/orcid.png'],
  },
  turbopack: {
    rules: {
      "*.css": {
        condition: { all: [{ not: 'foreign' }, { not: { path: '*.module.css' } }] },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

