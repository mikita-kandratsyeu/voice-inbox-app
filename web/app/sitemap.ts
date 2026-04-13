import type { MetadataRoute } from 'next';

import { BASE_URL_OR_FALLBACK } from '@/config/constants';
import { allPublishedReleasePaths } from '@/lib/releases';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = BASE_URL_OR_FALLBACK;

  const routes = [
    { path: '', priority: 1 },
    { path: '/privacy', priority: 0.8 },
    { path: '/terms', priority: 0.8 },
    { path: '/blog', priority: 0.75 },
  ];

  const locales = [{ prefix: '' }, { prefix: '/ru' }];

  const entries: MetadataRoute.Sitemap = [];

  for (const { prefix } of locales) {
    for (const { path, priority } of routes) {
      const url = `${baseUrl}${prefix}${path}`;
      entries.push({
        url,
        lastModified: new Date(),
        changeFrequency: path === '' ? 'weekly' : 'monthly',
        priority,
      });
    }
  }

  const releasePaths = await allPublishedReleasePaths();
  for (const { locale, slug } of releasePaths) {
    const prefix = locale === 'en' ? '' : `/${locale}`;
    entries.push({
      url: `${baseUrl}${prefix}/blog/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.72,
    });
  }

  return entries;
}
