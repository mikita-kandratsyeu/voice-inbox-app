import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.67', 'http://192.168.1.67:3000'],
  serverExternalPackages: ['@prisma/client', 'pg', '@prisma/adapter-pg'],
};

export default withNextIntl(nextConfig);
