import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const webRoot = path.dirname(fileURLToPath(import.meta.url));

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
  serverExternalPackages: ['@prisma/client', 'pg', '@prisma/adapter-pg', 'pdfkit'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.simpleicons.org',
      },
    ],
  },
  turbopack: {
    root: webRoot,
  },
};

export default withNextIntl(nextConfig);
