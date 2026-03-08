import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL as string;

  return {
    rules: [
      { userAgent: '*', allow: '/' },
      { userAgent: 'Googlebot', allow: '/' },
      { userAgent: 'Yandex', allow: '/' },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
