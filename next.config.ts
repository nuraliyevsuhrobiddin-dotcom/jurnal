import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  outputFileTracingIncludes: {
    '/api/**': ['./public/fonts/*.ttf'],
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
