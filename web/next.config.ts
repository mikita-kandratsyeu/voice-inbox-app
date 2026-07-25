import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(webRoot, '..');

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.67', 'http://192.168.1.67:3000'],
  transpilePackages: ['@zip.js/zip.js'],
  async redirects() {
    return [
      { source: '/releases', destination: '/blog', permanent: true },
      { source: '/releases/:slug', destination: '/blog/:slug', permanent: true },
      { source: '/ru/releases', destination: '/ru/blog', permanent: true },
      { source: '/ru/releases/:slug', destination: '/ru/blog/:slug', permanent: true },
    ];
  },
  serverExternalPackages: [
    '@prisma/client',
    'pg',
    '@prisma/adapter-pg',
    'pdfkit',
    'puppeteer',
    'sharp',
    'firebase-admin',
  ],
  outputFileTracingRoot: repoRoot,
  outputFileTracingIncludes: {
    '/api/admin/pro-licenses/**': [
      './public/app-icon.svg',
      './node_modules/sharp/**',
      './node_modules/@img/sharp-wasm32/**',
      './node_modules/@img/sharp-libvips-linux-x64/**',
      '../node_modules/@img/sharp-wasm32/**',
      '../node_modules/@img/sharp-libvips-linux-x64/**',
      '../node_modules/@img/sharp-linux-x64/lib/**',
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.simpleicons.org',
      },
    ],
  },
  turbopack: {
    root: repoRoot,
  },
};

export default withNextIntl(nextConfig);
