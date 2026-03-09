import type { MetadataRoute } from 'next';

import { BASE_URL_OR_FALLBACK } from '@/config/constants';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = BASE_URL_OR_FALLBACK;

  const routes = [
    { path: '', priority: 1 },
    { path: '/privacy', priority: 0.8 },
    { path: '/terms', priority: 0.8 },
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

  return entries;
}
